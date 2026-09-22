import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@maxtrone/db";
import { createProviders } from "@maxtrone/providers";
import { getQueues } from "@/lib/queues";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const providers = createProviders();
  const ok = providers.messaging.verifyWebhookSignature(
    raw,
    req.headers.get("x-hub-signature-256"),
  );
  if (!ok) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(raw || "{}");
  const externalId =
    payload?.entry?.[0]?.id ??
    payload?.id ??
    `wa:${Date.now()}`;

  await prisma.webhookEvent
    .create({
      data: {
        provider: "whatsapp",
        eventType: "inbound",
        externalId: String(externalId),
        payload,
      },
    })
    .catch(() => null);

  const queues = getQueues();
  await queues.messaging.add(
    "whatsapp-webhook",
    { payload, idempotencyKey: `wa-hook:${externalId}` },
    { jobId: `wa-hook:${externalId}`, attempts: 5 },
  );

  return NextResponse.json({ ok: true });
}
