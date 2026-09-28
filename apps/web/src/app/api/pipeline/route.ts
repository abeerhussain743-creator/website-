import { NextResponse } from "next/server";
import { z } from "zod";
import { Queue } from "bullmq";
import { auth } from "@/auth";
import { assertWorkspaceAccess, WorkspaceAccessError } from "@/lib/access";
import { prisma } from "@postpilot/db";
import {
  QUEUE_NAMES,
  redisConnectionFromUrl,
  runWeeklyPipeline,
  PIPELINE_STEPS,
} from "@postpilot/jobs";

const bodySchema = z.object({
  workspaceId: z.string(),
  promo: z.string().max(200).optional(),
  sync: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = bodySchema.parse(await req.json());
    await assertWorkspaceAccess(session.user.id, body.workspaceId, "EDITOR");

    const run = await prisma.pipelineRun.create({
      data: {
        workspaceId: body.workspaceId,
        status: "QUEUED",
        stepsJson: PIPELINE_STEPS.map((step) => ({
          step,
          status: "queued",
        })),
        triggeredById: session.user.id,
      },
    });

    const payload = {
      workspaceId: body.workspaceId,
      pipelineRunId: run.id,
      step: "FULL" as const,
      promo: body.promo,
      triggeredById: session.user.id,
    };

    if (body.sync || process.env.PIPELINE_SYNC === "true") {
      await runWeeklyPipeline(payload);
      const fresh = await prisma.pipelineRun.findUnique({ where: { id: run.id } });
      return NextResponse.json({ run: fresh });
    }

    const queue = new Queue(QUEUE_NAMES.pipeline, {
      connection: redisConnectionFromUrl(),
    });
    await queue.add("weekly-pipeline", payload, {
      jobId: `pipeline:${run.id}`,
      removeOnComplete: 100,
    });
    await queue.close();
    return NextResponse.json({ run });
  } catch (err) {
    if (err instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Pipeline failed to start" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = new URL(req.url).searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }
  try {
    await assertWorkspaceAccess(session.user.id, workspaceId);
    const runs = await prisma.pipelineRun.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    return NextResponse.json({ runs });
  } catch (err) {
    if (err instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
