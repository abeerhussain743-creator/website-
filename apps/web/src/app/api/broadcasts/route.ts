import { NextRequest, NextResponse } from "next/server";
import { requireApiTenant } from "@/lib/api-auth";
import { getQueues } from "@/lib/queues";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ctx = await requireApiTenant(req, "broadcasts.send");
  if ("error" in ctx && ctx.error) return ctx.error;
  const { db } = ctx as Exclude<typeof ctx, { error: NextResponse }>;
  const broadcasts = await db.broadcast.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ broadcasts });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiTenant(req, "broadcasts.send");
  if ("error" in ctx && ctx.error) return ctx.error;
  const { db, institution, session } = ctx as Exclude<typeof ctx, { error: NextResponse }>;
  const body = await req.json();

  const guardians = await db.guardian.findMany({
    where: { whatsappOptIn: true, deletedAt: null },
    take: 5000,
  });

  const estimatedCostPaisa = guardians.length * 50; // rough meter
  const broadcast = await db.broadcast.create({
    data: {
      title: String(body.title || "Announcement"),
      body: String(body.body || ""),
      status: body.sendNow ? "SENDING" : "DRAFT",
      audienceFilter: body.audienceFilter ?? { all: true },
      estimatedCostPaisa,
    } as never,
  });

  for (const g of guardians) {
    await db.broadcastRecipient.create({
      data: {
        broadcastId: broadcast.id,
        guardianId: g.id,
        phone: g.phone,
        status: "QUEUED",
      } as never,
    });
  }

  if (body.sendNow) {
    const queues = getQueues();
    await queues.messaging.add(
      "broadcast-send",
      {
        institutionId: institution.id,
        broadcastId: broadcast.id,
        idempotencyKey: `bcast:${broadcast.id}`,
      },
      { jobId: `bcast:${broadcast.id}`, attempts: 3 },
    );
  }

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "broadcast.create",
    entityType: "Broadcast",
    entityId: broadcast.id,
    metadata: { recipients: guardians.length, estimatedCostPaisa },
  });

  return NextResponse.json({
    broadcastId: broadcast.id,
    recipients: guardians.length,
    estimatedCostPaisa,
    estimatedCostLabel: `PKR ${(estimatedCostPaisa / 100).toLocaleString("en-PK")}`,
  });
}
