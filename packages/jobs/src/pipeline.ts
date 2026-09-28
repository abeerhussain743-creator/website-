import { prisma, ContentPlanStatus, PlannedPostStatus, OnboardingStep } from "@postpilot/db";
import {
  generateBrandDna,
  diagnoseStage,
  buildWeeklyPlan,
  generatePost,
  discoverCompetitors,
  buildNichePlaybook,
  type BrandContext,
} from "@postpilot/ai";
import { publishPost, simulateMetrics } from "@postpilot/social";
import { renderPostPng } from "@postpilot/design";
import { storageFromEnv } from "@postpilot/storage";
import { PIPELINE_STEPS, type PipelineJob } from "./index.js";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash, randomBytes } from "node:crypto";

const execFileAsync = promisify(execFile);

async function markStep(
  pipelineRunId: string,
  step: string,
  status: "running" | "completed" | "failed",
  detail?: unknown,
) {
  const run = await prisma.pipelineRun.findUniqueOrThrow({
    where: { id: pipelineRunId },
  });
  const steps = Array.isArray(run.stepsJson) ? [...(run.stepsJson as object[])] : [];
  const existing = steps.findIndex((s) => (s as { step?: string }).step === step);
  const entry = {
    step,
    status,
    at: new Date().toISOString(),
    detail: detail ?? null,
  };
  if (existing >= 0) steps[existing] = entry;
  else steps.push(entry);
  await prisma.pipelineRun.update({
    where: { id: pipelineRunId },
    data: {
      currentStep: step as never,
      stepsJson: steps,
      status: status === "failed" ? "FAILED" : "RUNNING",
    },
  });
}

async function loadBrandContext(workspaceId: string): Promise<BrandContext> {
  const [brand, kit] = await Promise.all([
    prisma.brandProfile.findUnique({ where: { workspaceId } }),
    prisma.brandKit.findFirst({ where: { workspaceId, isPrimary: true } }),
  ]);
  if (!brand) throw new Error("Brand profile missing — finish onboarding");
  return {
    businessName: brand.businessName,
    industry: brand.industry ?? undefined,
    niche: brand.niche ?? undefined,
    usp: brand.usp ?? undefined,
    toneSliders: (brand.toneSliders as BrandContext["toneSliders"]) ?? undefined,
    wordsToUse: brand.wordsToUse,
    wordsToAvoid: brand.wordsToAvoid,
    goals: brand.goals,
    audience: (brand.audienceJson as BrandContext["audience"]) ?? undefined,
    brandKit: kit
      ? {
          primaryColor: kit.primaryColor ?? undefined,
          secondaryColor: kit.secondaryColor ?? undefined,
          accentColor: kit.accentColor ?? undefined,
          backgroundColor: kit.backgroundColor ?? undefined,
          textColor: kit.textColor ?? undefined,
          fontHeading: kit.fontHeading ?? undefined,
          fontBody: kit.fontBody ?? undefined,
        }
      : undefined,
  };
}

async function renderViaCli(input: unknown): Promise<Buffer> {
  const tmp = await mkdtemp(path.join(tmpdir(), "pp-pipe-"));
  try {
    const inputPath = path.join(tmp, "in.json");
    const outputPath = path.join(tmp, "out.png");
    await writeFile(inputPath, JSON.stringify(input));
    const cli = path.resolve("/workspace/packages/design/dist/cli-render.js");
    await execFileAsync(process.execPath, [cli, inputPath, outputPath], {
      maxBuffer: 15 * 1024 * 1024,
    });
    return await readFile(outputPath);
  } finally {
    await rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function runWeeklyPipeline(job: PipelineJob) {
  const { workspaceId, pipelineRunId } = job;
  const steps =
    job.step === "FULL" ? [...PIPELINE_STEPS] : [job.step];

  await prisma.pipelineRun.update({
    where: { id: pipelineRunId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    const brand = await loadBrandContext(workspaceId);
    let contentPlanId: string | undefined;

    for (const step of steps) {
      await markStep(pipelineRunId, step, "running");

      if (step === "REFRESH_COMPETITORS") {
        const found = discoverCompetitors({
          businessName: brand.businessName,
          niche: brand.niche,
          industry: brand.industry,
        });
        for (const c of found) {
          const row = await prisma.competitor.upsert({
            where: {
              workspaceId_platform_handle: {
                workspaceId,
                platform: c.platform,
                handle: c.handle,
              },
            },
            create: {
              workspaceId,
              platform: c.platform,
              handle: c.handle,
              tier: c.tier,
              source: "LLM",
              momentumScore: c.momentumScore,
              relevanceScore: c.relevanceScore,
              displayName: c.handle,
              metaJson: { why: c.why },
            },
            update: {
              tier: c.tier,
              momentumScore: c.momentumScore,
              relevanceScore: c.relevanceScore,
              metaJson: { why: c.why },
            },
          });
          await prisma.competitorSnapshot.create({
            data: {
              competitorId: row.id,
              followers: c.followers,
              engagementRate: c.engagementRate,
              growth7dPct: c.growth7dPct,
            },
          });
        }
        await markStep(pipelineRunId, step, "completed", { count: found.length });
      }

      if (step === "ANALYZE_COMPETITOR_POSTS") {
        const competitors = await prisma.competitor.findMany({
          where: { workspaceId, deletedAt: null },
        });
        let created = 0;
        for (const c of competitors) {
          for (let i = 0; i < 5; i++) {
            const platformPostId = `${c.handle}_post_${i + 1}`;
            await prisma.competitorPost.upsert({
              where: {
                competitorId_platformPostId: {
                  competitorId: c.id,
                  platformPostId,
                },
              },
              create: {
                competitorId: c.id,
                platformPostId,
                format: i % 3 === 0 ? "REEL" : i % 3 === 1 ? "CAROUSEL" : "SINGLE_IMAGE",
                caption: `Sample public post from @${c.handle} about ${brand.niche || "the niche"} (#${i + 1})`,
                postedAt: new Date(Date.now() - i * 86400000 * 2),
                likeCount: 40 + i * 17,
                commentCount: 3 + i,
                saveCount: 5 + i * 2,
                engagementTotal: 50 + i * 20,
                isOutlier: i === 0,
                outlierReason:
                  i === 0
                    ? "3× median engagement — strong hook + saveable carousel structure"
                    : null,
                contentPillar: "EDUCATIONAL",
                hookType: "CONTRARIAN",
                ctaType: "SAVE",
              },
              update: {},
            });
            created++;
          }
        }
        await markStep(pipelineRunId, step, "completed", { created });
      }

      if (step === "UPDATE_NICHE_PLAYBOOK") {
        const playbook = buildNichePlaybook(brand.niche || brand.industry || "brand");
        const latest = await prisma.nichePlaybook.findFirst({
          where: { workspaceId },
          orderBy: { version: "desc" },
        });
        const version = (latest?.version ?? 0) + 1;
        await prisma.nichePlaybook.updateMany({
          where: { workspaceId, isActive: true },
          data: { isActive: false },
        });
        await prisma.nichePlaybook.create({
          data: {
            workspaceId,
            version,
            isActive: true,
            winningFormats: playbook.winningFormats,
            hookPatterns: playbook.hookPatterns,
            topicClusters: playbook.topicClusters,
            bestPostingWindows: playbook.bestPostingWindows,
            trendingThemes: playbook.trendingThemes,
            contentGaps: playbook.contentGaps,
            whatChanged: playbook.whatChanged,
          },
        });
        await markStep(pipelineRunId, step, "completed", { version });
      }

      if (step === "SYNC_OWN_ACCOUNT_METRICS") {
        let account = await prisma.socialAccount.findFirst({
          where: { workspaceId, platform: "INSTAGRAM", deletedAt: null },
        });
        if (!account) {
          account = await prisma.socialAccount.create({
            data: {
              workspaceId,
              platform: "INSTAGRAM",
              status: "CONNECTED",
              externalAccountId: `demo_${workspaceId.slice(-6)}`,
              username: brand.businessName.toLowerCase().replace(/\s+/g, ""),
              displayName: brand.businessName,
              metaJson: { demo: true },
            },
          });
        }
        await prisma.accountSnapshot.create({
          data: {
            socialAccountId: account.id,
            followers: 4200,
            following: 310,
            mediaCount: 86,
            reach: 9100,
            impressions: 14000,
            engagementRate: 3.4,
            profileViews: 520,
          },
        });
        await prisma.socialAccount.update({
          where: { id: account.id },
          data: { lastSyncAt: new Date() },
        });
        await markStep(pipelineRunId, step, "completed", { followers: 4200 });
      }

      if (step === "DIAGNOSE_STAGE") {
        const snap = await prisma.accountSnapshot.findFirst({
          orderBy: { capturedAt: "desc" },
          where: {
            socialAccount: { workspaceId },
          },
        });
        const report = diagnoseStage({
          followers: snap?.followers ?? 500,
          engagementRate: snap?.engagementRate ?? 2.5,
          postsLast30Days: 10,
          avgReach: snap?.reach ?? undefined,
        });
        await prisma.stageReport.create({
          data: {
            workspaceId,
            stage: report.stage,
            score: report.score,
            nicheRelative: report.nicheRelative,
            signalsJson: report.signals,
            bottlenecksJson: report.bottlenecks,
            contentMixJson: report.contentMix,
            summary: report.summary,
            periodStart: new Date(Date.now() - 7 * 86400000),
            periodEnd: new Date(),
          },
        });

        // Ensure Brand DNA exists
        const dnaCount = await prisma.brandDNA.count({ where: { workspaceId } });
        if (dnaCount === 0) {
          const dna = generateBrandDna(brand);
          await prisma.brandDNA.create({
            data: {
              workspaceId,
              version: 1,
              isActive: true,
              voiceRules: dna.voiceRules,
              contentPillars: dna.contentPillars,
              audiencePersona: dna.audiencePersona,
              doList: dna.doList,
              dontList: dna.dontList,
              visualStyleGuide: dna.visualStyleGuide,
              provenHooks: dna.provenHooks,
              rawDocument: dna.rawDocument,
            },
          });
        }

        await markStep(pipelineRunId, step, "completed", { stage: report.stage });
      }

      if (step === "BUILD_WEEKLY_PLAN") {
        const stageRow = await prisma.stageReport.findFirst({
          where: { workspaceId },
          orderBy: { createdAt: "desc" },
        });
        const stage = diagnoseStage({
          followers: (stageRow?.signalsJson as { followers?: number })?.followers ?? 4200,
          engagementRate:
            (stageRow?.signalsJson as { engagementRate?: number })?.engagementRate ?? 3.4,
          postsLast30Days: 10,
        });
        const plan = buildWeeklyPlan({
          brand,
          stage,
          promo: job.promo,
          weekStart: job.weekStart ? new Date(job.weekStart) : undefined,
        });

        const existing = await prisma.contentPlan.findUnique({
          where: {
            workspaceId_weekStart: {
              workspaceId,
              weekStart: new Date(plan.weekStart),
            },
          },
        });
        if (existing) {
          await prisma.plannedPost.deleteMany({ where: { contentPlanId: existing.id } });
          await prisma.contentPlan.delete({ where: { id: existing.id } });
        }

        const contentPlan = await prisma.contentPlan.create({
          data: {
            workspaceId,
            weekStart: new Date(plan.weekStart),
            weekEnd: new Date(plan.weekEnd),
            status: ContentPlanStatus.GENERATING,
            title: plan.title,
            rationale: plan.rationale,
            pipelineRunId,
            createdById: job.triggeredById,
            posts: {
              create: plan.days.map((d) => ({
                workspaceId,
                dayIndex: d.dayIndex,
                platforms: d.platforms,
                format: d.format,
                pillar: "EDUCATIONAL",
                topic: d.topic,
                hookAngle: d.hookAngle,
                objective: d.objective,
                targetPublishAt: new Date(d.targetPublishAt),
                rationale: d.rationale,
                status: PlannedPostStatus.PLANNED,
                sortOrder: d.dayIndex,
              })),
            },
          },
          include: { posts: true },
        });
        contentPlanId = contentPlan.id;
        await markStep(pipelineRunId, step, "completed", {
          contentPlanId,
          posts: contentPlan.posts.length,
        });
      }

      if (step === "GENERATE_POSTS" || step === "QUALITY_CRITIC") {
        const plan =
          (contentPlanId
            ? await prisma.contentPlan.findUnique({
                where: { id: contentPlanId },
                include: { posts: true },
              })
            : await prisma.contentPlan.findFirst({
                where: { workspaceId, status: ContentPlanStatus.GENERATING },
                orderBy: { createdAt: "desc" },
                include: { posts: true },
              })) ??
          (await prisma.contentPlan.findFirst({
            where: { workspaceId },
            orderBy: { createdAt: "desc" },
            include: { posts: true },
          }));
        if (!plan) throw new Error("No content plan to generate");
        contentPlanId = plan.id;

        if (step === "QUALITY_CRITIC") {
          // Drafts already scored during GENERATE_POSTS; mark complete.
          await markStep(pipelineRunId, step, "completed", {
            posts: plan.posts.length,
          });
          continue;
        }

        for (const post of plan.posts) {
          const generated = await generatePost({
            brand,
            platform: post.platforms[0] ?? "INSTAGRAM",
            format: post.format as never,
            topic: post.topic ?? undefined,
            objective: (post.objective as never) ?? "engagement",
          });
          await prisma.postDraft.updateMany({
            where: { plannedPostId: post.id, isActive: true },
            data: { isActive: false },
          });
          const version =
            (await prisma.postDraft.count({ where: { plannedPostId: post.id } })) + 1;
          await prisma.postDraft.create({
            data: {
              plannedPostId: post.id,
              version,
              isActive: true,
              selectedHook: generated.selectedHook,
              hooksJson: generated.hooks,
              caption: generated.caption,
              hashtags: generated.hashtags,
              carouselSlides: generated.slides,
              reelScript: generated.reelScript,
              altText: generated.altText,
              firstComment: generated.hashtags.slice(0, 5).join(" "),
              qualityScores: generated.qualityScores,
              qualityPassed: generated.qualityPassed,
              originalityScore: generated.qualityScores.originality,
            },
          });
          await prisma.plannedPost.update({
            where: { id: post.id },
            data: {
              status: generated.qualityPassed
                ? PlannedPostStatus.READY
                : PlannedPostStatus.GENERATING,
            },
          });
          await prisma.aICallLog.create({
            data: {
              workspaceId,
              provider: "OTHER",
              kind: "COPY",
              model: generated.provider,
              success: true,
              metaJson: { plannedPostId: post.id, quality: generated.qualityScores },
            },
          });
        }
        await markStep(pipelineRunId, step, "completed", { posts: plan.posts.length });
      }

      if (step === "RENDER_DESIGNS") {
        const plan = await prisma.contentPlan.findFirst({
          where: { id: contentPlanId, workspaceId },
          include: {
            posts: { include: { drafts: { where: { isActive: true }, take: 1 } } },
          },
        });
        if (!plan) throw new Error("No plan for render");
        const storage = storageFromEnv();
        for (const post of plan.posts) {
          const draft = post.drafts[0];
          if (!draft?.selectedHook) continue;
          const family =
            post.format === "CAROUSEL"
              ? "listicle"
              : post.format === "REEL"
                ? "bold"
                : "editorial";
          const png = await renderViaCli({
            family,
            size: "FEED_PORTRAIT",
            brandKit: {
              primaryColor: brand.brandKit?.primaryColor ?? "#0F3D3E",
              secondaryColor: brand.brandKit?.secondaryColor ?? "#E8D5B7",
              accentColor: brand.brandKit?.accentColor ?? "#D97706",
              backgroundColor: brand.brandKit?.backgroundColor ?? "#FAF7F2",
              textColor: brand.brandKit?.textColor ?? "#14212B",
            },
            content: {
              businessName: brand.businessName,
              headline: draft.selectedHook.slice(0, 90),
              body: post.topic ?? draft.caption?.slice(0, 120),
              cta: "Save this",
              badge: brand.niche || brand.businessName,
            },
          });
          const { key, url } = await storage.putObject({
            body: png,
            contentType: "image/png",
            prefix: `workspaces/${workspaceId}/designs`,
          });
          const media = await prisma.mediaAsset.create({
            data: {
              workspaceId,
              kind: "GENERATED_IMAGE",
              source: "RENDER",
              storageKey: key,
              url,
              mimeType: "image/png",
              byteSize: png.byteLength,
              width: 1080,
              height: 1350,
              altText: draft.altText,
            },
          });
          await prisma.designAsset.create({
            data: {
              plannedPostId: post.id,
              workspaceId,
              kind: "FEED_PORTRAIT",
              templateId: family,
              width: 1080,
              height: 1350,
              storageKey: key,
              url,
              mediaAssetId: media.id,
            },
          });
        }
        await markStep(pipelineRunId, step, "completed");
      }

      if (step === "NOTIFY_FOR_APPROVAL") {
        const plan = await prisma.contentPlan.findFirst({
          where: { workspaceId },
          orderBy: { createdAt: "desc" },
        });
        if (plan) {
          await prisma.contentPlan.update({
            where: { id: plan.id },
            data: { status: ContentPlanStatus.READY_FOR_REVIEW },
          });
          const token = randomBytes(24).toString("hex");
          const tokenHash = createHash("sha256").update(token).digest("hex");
          await prisma.approvalMagicLink.create({
            data: {
              workspaceId,
              contentPlanId: plan.id,
              tokenHash,
              expiresAt: new Date(Date.now() + 7 * 86400000),
            },
          });
          // token is logged for demo; email/WhatsApp in later polish
          console.info(
            `[PostPilot] Approval magic token for workspace ${workspaceId}: ${token}`,
          );
        }
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: { onboardingStep: OnboardingStep.COMPLETE },
        });
        await markStep(pipelineRunId, step, "completed");
      }
    }

    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        currentStep: steps[steps.length - 1] as never,
      },
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: {
        status: "FAILED",
        errorMessage: message,
        finishedAt: new Date(),
      },
    });
    throw err;
  }
}

export async function approvePlannedPost(input: {
  plannedPostId: string;
  userId?: string;
  channel?: "DASHBOARD" | "MAGIC_LINK" | "AUTO";
}) {
  const post = await prisma.plannedPost.findUniqueOrThrow({
    where: { id: input.plannedPostId },
  });
  await prisma.approval.create({
    data: {
      plannedPostId: post.id,
      status: "APPROVED",
      channel: input.channel ?? "DASHBOARD",
      actorUserId: input.userId,
    },
  });
  await prisma.plannedPost.update({
    where: { id: post.id },
    data: { status: "APPROVED" },
  });
  return post;
}

export async function scheduleApprovedPosts(workspaceId: string, contentPlanId: string) {
  const posts = await prisma.plannedPost.findMany({
    where: {
      contentPlanId,
      status: { in: ["APPROVED", "READY"] },
    },
  });
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
  });
  if (workspace.autoApprove) {
    for (const p of posts.filter((x) => x.status === "READY")) {
      await approvePlannedPost({
        plannedPostId: p.id,
        channel: "AUTO",
      });
    }
  }
  const approved = await prisma.plannedPost.findMany({
    where: { contentPlanId, status: "APPROVED" },
  });
  for (const post of approved) {
    const runAt = post.targetPublishAt ?? new Date(Date.now() + 60000);
    const idempotencyKey = `publish:${post.id}`;
    await prisma.scheduledJob.upsert({
      where: { idempotencyKey },
      create: {
        workspaceId,
        plannedPostId: post.id,
        kind: "PUBLISH_POST",
        status: "PENDING",
        runAt,
        idempotencyKey,
        payloadJson: { plannedPostId: post.id },
      },
      update: { runAt, status: "PENDING" },
    });
    await prisma.plannedPost.update({
      where: { id: post.id },
      data: { status: "SCHEDULED" },
    });
  }
  await prisma.contentPlan.update({
    where: { id: contentPlanId },
    data: { status: "SCHEDULED" },
  });
  return { scheduled: approved.length };
}

export async function publishPlannedPost(plannedPostId: string) {
  const post = await prisma.plannedPost.findUniqueOrThrow({
    where: { id: plannedPostId },
    include: {
      drafts: { where: { isActive: true }, take: 1 },
      designAssets: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const account = await prisma.socialAccount.findFirst({
    where: {
      workspaceId: post.workspaceId,
      platform: post.platforms[0] ?? "INSTAGRAM",
      deletedAt: null,
    },
  });
  if (!account) throw new Error("No social account connected");

  const draft = post.drafts[0];
  const result = await publishPost({
    platform: account.platform,
    caption: draft?.caption ?? post.topic ?? "",
    mediaUrls: post.designAssets[0]?.url ? [post.designAssets[0].url] : [],
    firstComment: draft?.firstComment ?? undefined,
    idempotencyKey: `publish:${post.id}`,
    dryRun: true,
    externalAccountId: account.externalAccountId,
  });

  const published = await prisma.publishedPost.create({
    data: {
      plannedPostId: post.id,
      socialAccountId: account.id,
      platform: account.platform,
      platformPostId: result.platformPostId,
      platformUrl: result.platformUrl,
      rawJson: result.raw as object,
    },
  });
  await prisma.plannedPost.update({
    where: { id: post.id },
    data: { status: "PUBLISHED" },
  });
  await prisma.scheduledJob.updateMany({
    where: { plannedPostId: post.id, kind: "PUBLISH_POST" },
    data: { status: "COMPLETED" },
  });

  // schedule metric pulls
  for (const tp of ["H1", "H24", "H72", "D7"] as const) {
    const delayHrs = tp === "H1" ? 1 : tp === "H24" ? 24 : tp === "H72" ? 72 : 168;
    await prisma.scheduledJob.create({
      data: {
        workspaceId: post.workspaceId,
        plannedPostId: post.id,
        kind: "PULL_METRICS",
        status: "PENDING",
        runAt: new Date(Date.now() + delayHrs * 3600 * 1000),
        idempotencyKey: `metrics:${published.id}:${tp}`,
        payloadJson: { publishedPostId: published.id, timepoint: tp },
      },
    });
  }

  return published;
}

export async function pullMetrics(publishedPostId: string, timepoint: "H1" | "H24" | "H72" | "D7") {
  const published = await prisma.publishedPost.findUniqueOrThrow({
    where: { id: publishedPostId },
  });
  const metrics = simulateMetrics(published.platformPostId, timepoint);
  return prisma.postMetric.create({
    data: {
      publishedPostId,
      timepoint,
      ...metrics,
      rawJson: { simulated: true },
    },
  });
}

export async function buildWeeklyReport(workspaceId: string) {
  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() + 1);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  const metrics = await prisma.postMetric.findMany({
    where: {
      publishedPost: { plannedPost: { workspaceId } },
      timepoint: "H24",
    },
    orderBy: { capturedAt: "desc" },
    take: 20,
  });
  const stage = await prisma.stageReport.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
  const playbook = await prisma.nichePlaybook.findFirst({
    where: { workspaceId, isActive: true },
  });

  const summary = {
    headline: "Weekly performance snapshot",
    stage: stage?.stage ?? "TRACTION",
    topMetricCount: metrics.length,
    avgLikes:
      metrics.reduce((a, m) => a + (m.likes ?? 0), 0) /
      Math.max(metrics.length, 1),
    whatWorked: [
      "Save-optimized carousels",
      "Hooks under 90 characters",
    ],
    whatDidnt: ["Generic CTAs without a ritual ask"],
    nextWeekChanges: [
      "Increase Reel share per stage mix",
      "Double down on top pillar",
    ],
    competitorMoves: (playbook?.whatChanged as string[]) ?? [],
  };

  return prisma.weeklyReport.upsert({
    where: {
      workspaceId_weekStart: {
        workspaceId,
        weekStart,
      },
    },
    create: {
      workspaceId,
      weekStart,
      weekEnd,
      summaryJson: summary,
    },
    update: { summaryJson: summary },
  });
}

// silence unused import when renderPostPng only used conceptually
void renderPostPng;
