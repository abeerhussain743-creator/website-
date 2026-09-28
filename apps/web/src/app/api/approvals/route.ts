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
  ]),
  feedback: z.string().max(2000).optional(),
});

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
      await prisma.plannedPost.update({
        where: { id: body.plannedPostId },
        data: { status: "CHANGES_REQUESTED" },
      });
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
      // Force approve if needed
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
