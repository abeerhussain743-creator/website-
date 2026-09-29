import { prisma, ContentPlanStatus, PlannedPostStatus, OnboardingStep } from "@postpilot/db";
import {
  generateBrandDna,
  diagnoseStage,
  buildWeeklyPlan,
  generatePost,
  discoverCompetitors,
  buildNichePlaybook,
  ingestWebsite,
  deriveLearningInsights,
  enrichBrandFromDna,
  notifyApprovalLink,
  QUALITY_THRESHOLD,
  type BrandContext,
  type NichePlaybookDoc,
} from "@postpilot/ai";
import {
  publishPost,
  simulateMetrics,
  syncAccountMetrics,
  isPublishDryRun,
} from "@postpilot/social";
import { storageFromEnv } from "@postpilot/storage";
import { PIPELINE_STEPS, type PipelineJob } from "./index.js";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash, randomBytes } from "node:crypto";

const execFileAsync = promisify(execFile);

function mapPillar(name?: string | null): "EDUCATIONAL" | "ENTERTAINMENT" | "BEHIND_THE_SCENES" | "TESTIMONIAL" | "PRODUCT" | "PROMOTIONAL" | "COMMUNITY" | "THOUGHT_LEADERSHIP" | "UGC" | "TREND" | "OTHER" {
  const n = (name || "").toLowerCase();
  if (n.includes("craft") || n.includes("expertise") || n.includes("educat")) return "EDUCATIONAL";
  if (n.includes("ritual") || n.includes("behind")) return "BEHIND_THE_SCENES";
  if (n.includes("proof") || n.includes("testimonial") || n.includes("customer")) return "TESTIMONIAL";
  if (n.includes("community") || n.includes("culture")) return "COMMUNITY";
  if (n.includes("offer") || n.includes("launch") || n.includes("promo")) return "PROMOTIONAL";
  if (n.includes("product")) return "PRODUCT";
  if (n.includes("thought") || n.includes("pov") || n.includes("bold")) return "THOUGHT_LEADERSHIP";
  if (n.includes("trend")) return "TREND";
  return "OTHER";
}

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

async function fetchScraperJson(
  pathName: string,
  body: unknown,
): Promise<unknown | null> {
  const base = process.env.SCRAPER_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}${pathName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SCRAPER_API_KEY
          ? { "X-API-Key": process.env.SCRAPER_API_KEY }
          : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
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

async function assertCredits(workspaceId: string, cost = 1) {
  const ws = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    include: { organization: { include: { subscription: true } } },
  });
  const sub = ws.organization.subscription;
  if (!sub) return;
  if (sub.creditBalance < cost) {
    // Demo safety: top up instead of hard-failing empty trials
    if (process.env.NODE_ENV !== "production" || sub.metaJson) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { creditBalance: sub.creditBalance + cost + 50 },
      });
      await prisma.creditLedger.create({
        data: {
          workspaceId,
          amount: cost + 50,
          reason: "GRANT",
          description: "Auto top-up for demo/trial",
          balanceAfter: sub.creditBalance + cost + 50,
        },
      });
    } else {
      throw new Error("Insufficient AI credits — upgrade plan in Settings");
    }
  }
  const fresh = await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } });
  const balanceAfter = fresh.creditBalance - cost;
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { creditBalance: balanceAfter },
  });
  await prisma.creditLedger.create({
    data: {
      workspaceId,
      amount: -cost,
      reason: "GENERATION",
      description: "Pipeline generation",
      balanceAfter,
    },
  });
}

export async function runWeeklyPipeline(job: PipelineJob) {
  const { workspaceId, pipelineRunId } = job;
  const steps = job.step === "FULL" ? [...PIPELINE_STEPS] : [job.step];

  await prisma.pipelineRun.update({
    where: { id: pipelineRunId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    await assertCredits(workspaceId, steps.includes("GENERATE_POSTS") ? 7 : 1);
    let brand = await loadBrandContext(workspaceId);
    let contentPlanId: string | undefined;

    // Enrich with website signals early when URL present
    const brandRow = await prisma.brandProfile.findUnique({ where: { workspaceId } });
    if (brandRow?.websiteUrl) {
      const signals = await ingestWebsite({
        url: brandRow.websiteUrl,
        businessName: brand.businessName,
      });
      if (!brand.usp && signals.description) {
        brand = { ...brand, usp: signals.description.slice(0, 240) };
      }
      if (!brand.audience?.desires && signals.aboutSnippet) {
        brand = {
          ...brand,
          audience: {
            ...brand.audience,
            desires: signals.aboutSnippet.slice(0, 160),
          },
        };
      }
      (job as { _websiteSignals?: typeof signals })._websiteSignals = signals;
    }

    for (const step of steps) {
      await markStep(pipelineRunId, step, "running");

      if (step === "REFRESH_COMPETITORS") {
        const scraped = (await fetchScraperJson("/v1/competitors/discover", {
          business_name: brand.businessName,
          niche: brand.niche,
          industry: brand.industry,
        })) as { competitors?: ReturnType<typeof discoverCompetitors> } | null;

        const found =
          scraped?.competitors?.length
            ? scraped.competitors
            : discoverCompetitors({
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
              source: scraped ? "PLATFORM_SEARCH" : "LLM",
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

          // Momentum from snapshot deltas when prior exists
          const prior = await prisma.competitorSnapshot.findFirst({
            where: { competitorId: row.id },
            orderBy: { capturedAt: "desc" },
          });
          const growth =
            prior?.followers && prior.followers > 0
              ? ((c.followers - prior.followers) / prior.followers) * 100
              : c.growth7dPct;
          const momentum =
            prior && growth !== c.growth7dPct
              ? Math.min(99, Math.max(10, Math.round(50 + growth * 3)))
              : c.momentumScore;

          await prisma.competitor.update({
            where: { id: row.id },
            data: { momentumScore: momentum },
          });
          await prisma.competitorSnapshot.create({
            data: {
              competitorId: row.id,
              followers: c.followers,
              engagementRate: c.engagementRate,
              growth7dPct: growth,
            },
          });
        }
        await markStep(pipelineRunId, step, "completed", {
          count: found.length,
          source: scraped ? "scraper" : "seed",
        });
      }

      if (step === "ANALYZE_COMPETITOR_POSTS") {
        const competitors = await prisma.competitor.findMany({
          where: { workspaceId, deletedAt: null },
        });
        let created = 0;
        for (const c of competitors) {
          const scraped = (await fetchScraperJson("/v1/competitors/posts", {
            handle: c.handle,
            platform: c.platform,
            niche: brand.niche,
            limit: 5,
          })) as {
            posts?: Array<{
              platformPostId: string;
              format: string;
              caption: string;
              postedAtOffsetDays: number;
              likeCount: number;
              commentCount: number;
              saveCount: number;
              engagementTotal: number;
              isOutlier: boolean;
              outlierReason?: string | null;
              contentPillar?: string;
              hookType?: string;
              ctaType?: string;
            }>;
          } | null;

          const posts =
            scraped?.posts ??
            Array.from({ length: 5 }, (_, i) => ({
              platformPostId: `${c.handle}_post_${i + 1}`,
              format: i % 3 === 0 ? "REEL" : i % 3 === 1 ? "CAROUSEL" : "SINGLE_IMAGE",
              caption: `Sample public post from @${c.handle} about ${brand.niche || "the niche"} (#${i + 1})`,
              postedAtOffsetDays: i * 2,
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
            }));

          for (const p of posts) {
            await prisma.competitorPost.upsert({
              where: {
                competitorId_platformPostId: {
                  competitorId: c.id,
                  platformPostId: p.platformPostId,
                },
              },
              create: {
                competitorId: c.id,
                platformPostId: p.platformPostId,
                format: p.format as never,
                caption: p.caption,
                postedAt: new Date(Date.now() - p.postedAtOffsetDays * 86400000),
                likeCount: p.likeCount,
                commentCount: p.commentCount,
                saveCount: p.saveCount,
                engagementTotal: p.engagementTotal,
                isOutlier: p.isOutlier,
                outlierReason: p.outlierReason ?? null,
                contentPillar: "EDUCATIONAL" as const,
                hookType: "CONTRARIAN" as const,
                ctaType: "SAVE" as const,
              },
              update: {
                likeCount: p.likeCount,
                engagementTotal: p.engagementTotal,
                isOutlier: p.isOutlier,
              },
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
        const accounts = await prisma.socialAccount.findMany({
          where: { workspaceId, deletedAt: null },
        });
        let account = accounts.find((a) => a.platform === "INSTAGRAM") ?? accounts[0];
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
        const metrics = await syncAccountMetrics(
          account.platform,
          account.externalAccountId,
        );
        await prisma.accountSnapshot.create({
          data: {
            socialAccountId: account.id,
            ...metrics,
          },
        });
        await prisma.socialAccount.update({
          where: { id: account.id },
          data: { lastSyncAt: new Date() },
        });
        await markStep(pipelineRunId, step, "completed", {
          followers: metrics.followers,
          platform: account.platform,
        });
      }

      if (step === "DIAGNOSE_STAGE") {
        const snap = await prisma.accountSnapshot.findFirst({
          orderBy: { capturedAt: "desc" },
          where: { socialAccount: { workspaceId } },
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
            signalsJson: { ...report.signals, followers: snap?.followers, engagementRate: snap?.engagementRate },
            bottlenecksJson: report.bottlenecks,
            contentMixJson: report.contentMix,
            summary: report.summary,
            periodStart: new Date(Date.now() - 7 * 86400000),
            periodEnd: new Date(),
          },
        });

        const dnaCount = await prisma.brandDNA.count({ where: { workspaceId } });
        if (dnaCount === 0) {
          const website = brandRow?.websiteUrl
            ? await ingestWebsite({
                url: brandRow.websiteUrl,
                businessName: brand.businessName,
              })
            : undefined;
          let dna = generateBrandDna(brand);
          if (website) {
            dna = {
              ...dna,
              audiencePersona: {
                ...dna.audiencePersona,
                summary:
                  website.description ||
                  website.aboutSnippet ||
                  dna.audiencePersona.summary,
              },
              rawDocument: `${dna.rawDocument}\n\n## Website\n${website.url}\n${website.title ?? ""}\n${website.description ?? ""}`,
            };
          }
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
        const dna = await prisma.brandDNA.findFirst({
          where: { workspaceId, isActive: true },
        });
        const playbookRow = await prisma.nichePlaybook.findFirst({
          where: { workspaceId, isActive: true },
        });
        const lastReport = await prisma.weeklyReport.findFirst({
          where: { workspaceId },
          orderBy: { weekStart: "desc" },
        });
        const learningSummary = lastReport?.summaryJson as {
          whatWorked?: string[];
          whatDidnt?: string[];
          nextWeekChanges?: string[];
          provenHooks?: string[];
          topFormats?: string[];
          topPillars?: string[];
        } | null;

        const enriched = enrichBrandFromDna(brand, dna as never);
        const playbook: NichePlaybookDoc | null = playbookRow
          ? {
              winningFormats: playbookRow.winningFormats as NichePlaybookDoc["winningFormats"],
              hookPatterns: playbookRow.hookPatterns as string[],
              topicClusters: playbookRow.topicClusters as string[],
              bestPostingWindows:
                playbookRow.bestPostingWindows as NichePlaybookDoc["bestPostingWindows"],
              trendingThemes: playbookRow.trendingThemes as string[],
              contentGaps: playbookRow.contentGaps as string[],
              whatChanged: playbookRow.whatChanged as string[],
            }
          : null;

        const connected = await prisma.socialAccount.findMany({
          where: { workspaceId, deletedAt: null, status: "CONNECTED" },
          select: { platform: true },
        });
        const platforms = connected.length
          ? (connected.map((c) => c.platform) as Array<
              "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "X" | "TIKTOK"
            >)
          : (["INSTAGRAM"] as const);

        const plan = buildWeeklyPlan({
          brand: enriched,
          stage,
          promo: job.promo,
          weekStart: job.weekStart ? new Date(job.weekStart) : undefined,
          playbook,
          learning: learningSummary,
          platforms: [...new Set(platforms)],
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
                pillar: mapPillar(d.pillar) as never,
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
                include: {
                  posts: {
                    include: {
                      drafts: { where: { isActive: true }, take: 1 },
                      approvals: { orderBy: { createdAt: "desc" }, take: 1 },
                    },
                  },
                },
              })
            : await prisma.contentPlan.findFirst({
                where: { workspaceId, status: ContentPlanStatus.GENERATING },
                orderBy: { createdAt: "desc" },
                include: {
                  posts: {
                    include: {
                      drafts: { where: { isActive: true }, take: 1 },
                      approvals: { orderBy: { createdAt: "desc" }, take: 1 },
                    },
                  },
                },
              })) ??
          (await prisma.contentPlan.findFirst({
            where: { workspaceId },
            orderBy: { createdAt: "desc" },
            include: {
              posts: {
                include: {
                  drafts: { where: { isActive: true }, take: 1 },
                  approvals: { orderBy: { createdAt: "desc" }, take: 1 },
                },
              },
            },
          }));
        if (!plan) throw new Error("No content plan to generate");
        contentPlanId = plan.id;

        const dna = await prisma.brandDNA.findFirst({
          where: { workspaceId, isActive: true },
        });
        const enriched = enrichBrandFromDna(brand, dna as never);

        if (step === "QUALITY_CRITIC") {
          let rewritten = 0;
          for (const post of plan.posts) {
            const draft = post.drafts[0];
            const overall =
              (draft?.qualityScores as { overall?: number } | null)?.overall ?? 0;
            const feedback =
              post.approvals.find((a) => a.status === "CHANGES_REQUESTED")?.feedback ||
              (overall < QUALITY_THRESHOLD
                ? "Sharpen the hook, add a concrete niche detail, and end with a human CTA."
                : undefined);
            if (!feedback && draft?.qualityPassed) continue;

            const generated = await generatePost({
              brand: enriched,
              platform: post.platforms[0] ?? "INSTAGRAM",
              format: post.format as never,
              topic: post.topic ?? undefined,
              objective: (post.objective as never) ?? "engagement",
              pillar: post.pillar ?? undefined,
              feedback: feedback ?? undefined,
              templateFamily: undefined,
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
            rewritten++;
          }
          await markStep(pipelineRunId, step, "completed", {
            posts: plan.posts.length,
            rewritten,
          });
          continue;
        }

        for (const post of plan.posts) {
          const generated = await generatePost({
            brand: enriched,
            platform: post.platforms[0] ?? "INSTAGRAM",
            format: post.format as never,
            topic: post.topic ?? undefined,
            objective: (post.objective as never) ?? "engagement",
            pillar: post.pillar ?? undefined,
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

          const slides =
            post.format === "CAROUSEL" && Array.isArray(draft.carouselSlides)
              ? (draft.carouselSlides as Array<{ title?: string; body?: string }>)
              : [{ title: draft.selectedHook, body: post.topic ?? "" }];

          for (let i = 0; i < slides.length; i++) {
            const slide = slides[i]!;
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
                headline: (slide.title || draft.selectedHook).slice(0, 90),
                body: slide.body || post.topic || draft.caption?.slice(0, 120),
                cta: i === slides.length - 1 ? "Save this" : `Slide ${i + 1}`,
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
                templateId: `${family}:slide:${i + 1}`,
                width: 1080,
                height: 1350,
                storageKey: key,
                url,
                mediaAssetId: media.id,
              },
            });
          }
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
          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL ||
            process.env.AUTH_URL ||
            "http://localhost:3000";
          const approveUrl = `${baseUrl.replace(/\/$/, "")}/approve/${token}`;
          const notify = await notifyApprovalLink({
            approveUrl,
            workspaceName: brand.businessName,
            weekTitle: plan.title ?? "this week",
            channel: process.env.WHATSAPP_TOKEN ? "whatsapp" : undefined,
          });
          await markStep(pipelineRunId, step, "completed", {
            approveUrl,
            notify,
            token,
          });
        } else {
          await markStep(pipelineRunId, step, "completed");
        }
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: { onboardingStep: OnboardingStep.COMPLETE },
        });
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
      designAssets: { orderBy: { createdAt: "asc" } },
      approvals: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!["APPROVED", "SCHEDULED", "PUBLISHING"].includes(post.status)) {
    throw new Error(`Refusing to publish post in status ${post.status}`);
  }

  const account = await prisma.socialAccount.findFirst({
    where: {
      workspaceId: post.workspaceId,
      platform: post.platforms[0] ?? "INSTAGRAM",
      deletedAt: null,
    },
  });
  if (!account) throw new Error("No social account connected");

  const draft = post.drafts[0];
  const mediaUrls = post.designAssets.map((d) => d.url).filter(Boolean) as string[];
  const result = await publishPost({
    platform: account.platform,
    caption: draft?.caption ?? post.topic ?? "",
    mediaUrls,
    firstComment: draft?.firstComment ?? undefined,
    idempotencyKey: `publish:${post.id}`,
    dryRun: isPublishDryRun(),
    format: post.format as never,
    externalAccountId: account.externalAccountId,
    accessToken: account.accessTokenEnc ? "stored" : undefined,
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
    include: {
      publishedPost: {
        include: {
          plannedPost: {
            include: { drafts: { where: { isActive: true }, take: 1 } },
          },
        },
      },
    },
  });
  const stage = await prisma.stageReport.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
  const playbook = await prisma.nichePlaybook.findFirst({
    where: { workspaceId, isActive: true },
  });

  const learning = deriveLearningInsights({
    metrics: metrics.map((m) => ({
      likes: m.likes,
      saves: m.saves,
      comments: m.comments,
      reach: m.reach,
      format: m.publishedPost.plannedPost.format,
      pillar: m.publishedPost.plannedPost.pillar,
      hook: m.publishedPost.plannedPost.drafts[0]?.selectedHook,
    })),
    playbook: playbook
      ? {
          winningFormats: playbook.winningFormats as NichePlaybookDoc["winningFormats"],
          hookPatterns: playbook.hookPatterns as string[],
          topicClusters: playbook.topicClusters as string[],
          bestPostingWindows:
            playbook.bestPostingWindows as NichePlaybookDoc["bestPostingWindows"],
          trendingThemes: playbook.trendingThemes as string[],
          contentGaps: playbook.contentGaps as string[],
          whatChanged: playbook.whatChanged as string[],
        }
      : null,
  });

  // Persist learning into Brand DNA provenHooks + bump playbook note
  const dna = await prisma.brandDNA.findFirst({
    where: { workspaceId, isActive: true },
  });
  if (dna && learning.provenHooks.length) {
    const existing = Array.isArray(dna.provenHooks)
      ? (dna.provenHooks as string[])
      : [];
    await prisma.brandDNA.update({
      where: { id: dna.id },
      data: {
        provenHooks: [...learning.provenHooks, ...existing].slice(0, 12),
      },
    });
  }
  if (playbook) {
    await prisma.nichePlaybook.update({
      where: { id: playbook.id },
      data: {
        whatChanged: [
          ...learning.nextWeekChanges,
          ...((playbook.whatChanged as string[]) ?? []),
        ].slice(0, 8),
      },
    });
  }

  const summary = {
    headline: "Weekly performance snapshot",
    stage: stage?.stage ?? "TRACTION",
    topMetricCount: metrics.length,
    avgLikes:
      metrics.reduce((a, m) => a + (m.likes ?? 0), 0) / Math.max(metrics.length, 1),
    ...learning,
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
