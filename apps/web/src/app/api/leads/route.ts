import { NextRequest, NextResponse } from "next/server";
import { requireApiTenant } from "@/lib/api-auth";
import { craftAdmissionsReply, createEvent, ADMISSIONS_PROMPT_VERSION } from "@maxtrone/core";
import { getQueues } from "@/lib/queues";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ctx = await requireApiTenant(req, "admissions.read");
  if ("error" in ctx && ctx.error) return ctx.error;
  const { db } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const stages = await db.leadStage.findMany({ orderBy: { sortOrder: "asc" } });
  const leads = await db.lead.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ stages, leads });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiTenant(req, "admissions.write");
  if ("error" in ctx && ctx.error) return ctx.error;
  const { db, institution, session } = ctx as Exclude<typeof ctx, { error: NextResponse }>;
  const body = await req.json();

  if (body.action === "ai_reply") {
    const knowledge = await db.knowledgeBaseEntry.findMany();
    const reply = craftAdmissionsReply({
      message: String(body.message || ""),
      knowledge,
    });

    await db.aIInteraction.create({
      data: {
        promptVersion: ADMISSIONS_PROMPT_VERSION,
        input: String(body.message || ""),
        output: reply.text,
        sources: reply.sources,
        latencyMs: 5,
        conversationId: body.conversationId ?? null,
      } as never,
    });

    if (reply.handoff && body.leadId) {
      await db.task.create({
        data: {
          title: "Admissions handoff",
          description: `Parent message: ${body.message}`,
          status: "OPEN",
        } as never,
      });
    }

    return NextResponse.json(reply);
  }

  if (body.action === "move") {
    const stage = await db.leadStage.findFirst({ where: { id: body.stageId } });
    if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    await db.lead.update({
      where: { id: body.leadId },
      data: {
        stageId: body.stageId,
        status: stage.isWon ? "WON" : stage.isLost ? "LOST" : "OPEN",
        lostReason: body.lostReason ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
