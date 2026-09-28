import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { assertWorkspaceAccess, WorkspaceAccessError } from "@/lib/access";
import { prisma } from "@postpilot/db";
import {
  approvePlannedPost,
  scheduleApprovedPosts,
  publishPlannedPost,
} from "@postpilot/jobs";
import { generatePost } from "@postpilot/ai";
import type { BrandContext } from "@postpilot/ai";

const bodySchema = z.object({
  workspaceId: z.string(),
  plannedPostId: z.string().optional(),
  contentPlanId: z.string().optional(),
  action: z.enum([
    "approve",
    "approve_all",
    "request_changes",
    "reject",
    "schedule",
    "publish_now",
    "regenerate",
  ]),
  feedback: z.string().max(2000).optional(),
});

async function brandContextForWorkspace(workspaceId: string): Promise<BrandContext | null> {
  const brandRow = await prisma.brandProfile.findUnique({ where: { workspaceId } });
  const kit = await prisma.brandKit.findFirst({
    where: { workspaceId, isPrimary: true },
  });
  if (!brandRow) return null;
  return {
    businessName: brandRow.businessName,
    industry: brandRow.industry ?? undefined,
    niche: brandRow.niche ?? undefined,
    usp: brandRow.usp ?? undefined,
    toneSliders: brandRow.toneSliders as BrandContext["toneSliders"],
    wordsToUse: brandRow.wordsToUse,
    wordsToAvoid: brandRow.wordsToAvoid,
    goals: brandRow.goals,
    audience: brandRow.audienceJson as BrandContext["audience"],
    brandKit: kit
      ? {
          primaryColor: kit.primaryColor ?? undefined,
          accentColor: kit.accentColor ?? undefined,
        }
      : undefined,
  };
}

async function rewritePost(
  plannedPostId: string,
  brand: BrandContext,
  feedback?: string,
) {
  const post = await prisma.plannedPost.findUniqueOrThrow({
    where: { id: plannedPostId },
  });
  const generated = await generatePost({
    brand,
    platform: post.platforms[0] ?? "INSTAGRAM",
    format: post.format as never,
    topic: post.topic ?? undefined,
    objective: (post.objective as never) ?? "engagement",
    feedback,
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
      status: generated.qualityPassed ? "READY" : "CHANGES_REQUESTED",
    },
  });
  return generated;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = bodySchema.parse(await req.json());
    await assertWorkspaceAccess(session.user.id, body.workspaceId, "CLIENT_APPROVER");

    if (body.action === "approve" && body.plannedPostId) {
      await approvePlannedPost({
        plannedPostId: body.plannedPostId,
        userId: session.user.id,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "approve_all" && body.contentPlanId) {
      const posts = await prisma.plannedPost.findMany({
        where: {
          contentPlanId: body.contentPlanId,
          status: { in: ["READY", "CHANGES_REQUESTED"] },
        },
      });
      for (const p of posts) {
        await approvePlannedPost({
          plannedPostId: p.id,
          userId: session.user.id,
        });
      }
      return NextResponse.json({ ok: true, count: posts.length });
    }

    if (body.action === "request_changes" && body.plannedPostId) {
      await prisma.approval.create({
        data: {
          plannedPostId: body.plannedPostId,
          status: "CHANGES_REQUESTED",
          channel: "DASHBOARD",
          actorUserId: session.user.id,
          feedback: body.feedback,
        },
      });
      if (body.feedback) {
        await prisma.comment.create({
          data: {
            plannedPostId: body.plannedPostId,
            authorUserId: session.user.id,
            body: body.feedback,
          },
        });
      }
      await prisma.plannedPost.update({
        where: { id: body.plannedPostId },
        data: { status: "CHANGES_REQUESTED" },
      });
      const brand = await brandContextForWorkspace(body.workspaceId);
      if (brand) {
        await rewritePost(body.plannedPostId, brand, body.feedback);
      }
      return NextResponse.json({ ok: true });
    }

    if (body.action === "regenerate" && body.plannedPostId) {
      const brand = await brandContextForWorkspace(body.workspaceId);
      if (!brand) {
        return NextResponse.json({ error: "Brand missing" }, { status: 400 });
      }
      const last = await prisma.approval.findFirst({
        where: { plannedPostId: body.plannedPostId },
        orderBy: { createdAt: "desc" },
      });
      await rewritePost(body.plannedPostId, brand, last?.feedback ?? undefined);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "reject" && body.plannedPostId) {
      await prisma.approval.create({
        data: {
          plannedPostId: body.plannedPostId,
          status: "REJECTED",
          channel: "DASHBOARD",
          actorUserId: session.user.id,
          feedback: body.feedback,
        },
      });
      await prisma.plannedPost.update({
        where: { id: body.plannedPostId },
        data: { status: "REJECTED" },
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "schedule" && body.contentPlanId) {
      const result = await scheduleApprovedPosts(
        body.workspaceId,
        body.contentPlanId,
      );
      return NextResponse.json(result);
    }

    if (body.action === "publish_now" && body.plannedPostId) {
      const post = await prisma.plannedPost.findUniqueOrThrow({
        where: { id: body.plannedPostId },
      });
      if (post.status !== "APPROVED" && post.status !== "SCHEDULED") {
        await approvePlannedPost({
          plannedPostId: post.id,
          userId: session.user.id,
        });
      }
      const published = await publishPlannedPost(body.plannedPostId);
      return NextResponse.json({ published });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    if (err instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
