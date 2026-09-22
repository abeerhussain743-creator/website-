import { NextRequest, NextResponse } from "next/server";
import { requireApiTenant } from "@/lib/api-auth";
import { isWithinQuietHours } from "@maxtrone/core";
import { getQueues } from "@/lib/queues";

export async function GET(req: NextRequest) {
  const ctx = await requireApiTenant(req, "inbox.read");
  if ("error" in ctx && ctx.error) return ctx.error;
  const { db } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const conversations = await db.conversation.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiTenant(req, "inbox.write");
  if ("error" in ctx && ctx.error) return ctx.error;
  const { db, institution, session } = ctx as Exclude<typeof ctx, { error: NextResponse }>;
  const body = await req.json();

  if (body.action === "send") {
    const conversation = await db.conversation.findFirst({
      where: { id: body.conversationId },
    });
    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const now = new Date();
    const hour = now.getHours();
    const outsideWindow =
      !conversation.windowExpiresAt || conversation.windowExpiresAt < now;
    if (outsideWindow && !body.templateName) {
      return NextResponse.json(
        { error: "24-hour window closed — use an approved template" },
        { status: 400 },
      );
    }

    if (
      isWithinQuietHours(hour, institution.quietHoursStart, institution.quietHoursEnd) &&
      body.force !== true
    ) {
      return NextResponse.json(
        { error: "Quiet hours — automated/outbound blocked unless forced reply" },
        { status: 400 },
      );
    }

    const idempotencyKey = `out:${conversation.id}:${Date.now()}`;
    const message = await db.message.create({
      data: {
        conversationId: conversation.id,
        direction: "OUTBOUND",
        body: String(body.body || ""),
        status: "QUEUED",
        idempotencyKey,
        templateName: body.templateName ?? null,
      } as never,
    });

    const queues = getQueues();
    await queues.messaging.add(
      "send-text",
      {
        institutionId: institution.id,
        to: conversation.phone,
        body: message.body,
        idempotencyKey,
        messageId: message.id,
      },
      { jobId: idempotencyKey, attempts: 5, backoff: { type: "exponential", delay: 1000 } },
    );

    await db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), aiPaused: body.resumeAi === false ? true : conversation.aiPaused },
    });

    return NextResponse.json({ messageId: message.id });
  }

  if (body.action === "inbound_simulate") {
    // Dev/sandbox inbound WhatsApp webhook path
    const phone = String(body.phone || "");
    let conversation = await db.conversation.findFirst({ where: { phone } });
    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          phone,
          status: "AI_ACTIVE",
          windowExpiresAt: new Date(Date.now() + 24 * 3600 * 1000),
          lastMessageAt: new Date(),
        } as never,
      });
    } else {
      await db.conversation.update({
        where: { id: conversation.id },
        data: {
          windowExpiresAt: new Date(Date.now() + 24 * 3600 * 1000),
          lastMessageAt: new Date(),
        },
      });
    }

    await db.message.create({
      data: {
        conversationId: conversation.id,
        direction: "INBOUND",
        body: String(body.body || ""),
        status: "DELIVERED",
        idempotencyKey: `in:${conversation.id}:${Date.now()}`,
      } as never,
    });

    const queues = getQueues();
    await queues.messaging.add(
      "inbound-ai",
      {
        institutionId: institution.id,
        conversationId: conversation.id,
        body: String(body.body || ""),
        idempotencyKey: `ai:${conversation.id}:${Date.now()}`,
      },
      { attempts: 3 },
    );

    return NextResponse.json({ conversationId: conversation.id });
  }

  void session;
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
