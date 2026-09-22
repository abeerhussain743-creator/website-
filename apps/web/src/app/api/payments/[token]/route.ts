import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@maxtrone/db";
import { createProviders } from "@maxtrone/providers";
import {
  applyPaymentToInvoice,
} from "@maxtrone/core";
import { getQueues } from "@/lib/queues";

/**
 * Public parent payment page callback + checkout bootstrap.
 * Verifies mock/live signatures via PaymentProvider.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const invoice = await prisma.invoice.findFirst({
    where: { paymentLinkToken: token },
    include: { student: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    invoiceId: invoice.id,
    number: invoice.number,
    studentName: invoice.student.fullName,
    totalPaisa: invoice.totalPaisa,
    paidPaisa: invoice.paidPaisa,
    balancePaisa: invoice.totalPaisa - invoice.paidPaisa,
    dueDate: invoice.dueDate,
    status: invoice.status,
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const invoice = await prisma.invoice.findFirst({
    where: { paymentLinkToken: token },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const providers = createProviders();
  const raw = JSON.stringify(body);
  if (!providers.payment.verifyWebhookSignature(raw, req.headers.get("x-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Store raw webhook
  await prisma.webhookEvent.create({
    data: {
      institutionId: invoice.institutionId,
      provider: "payment",
      eventType: "payment.callback",
      externalId: body.providerPaymentId ?? body.idempotencyKey ?? `${token}:${Date.now()}`,
      payload: body,
      processedAt: null,
    },
  }).catch(() => null);

  const idempotencyKey = String(body.idempotencyKey || body.providerPaymentId);
  const existing = await prisma.payment.findFirst({
    where: {
      institutionId: invoice.institutionId,
      idempotencyKey,
    },
  });
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const amountPaisa = Number(body.amountPaisa ?? invoice.totalPaisa - invoice.paidPaisa);
  const applied = applyPaymentToInvoice({
    totalPaisa: invoice.totalPaisa,
    paidPaisa: invoice.paidPaisa,
    paymentPaisa: amountPaisa,
  });

  const payment = await prisma.payment.create({
    data: {
      institutionId: invoice.institutionId,
      studentId: invoice.studentId,
      channel: body.channel ?? "JAZZCASH",
      status: "SUCCEEDED",
      amountPaisa: applied.appliedPaisa,
      providerPaymentId: body.providerPaymentId ?? idempotencyKey,
      idempotencyKey,
      receivedAt: new Date(),
    },
  });

  await prisma.paymentAllocation.create({
    data: {
      institutionId: invoice.institutionId,
      paymentId: payment.id,
      invoiceId: invoice.id,
      amountPaisa: applied.appliedPaisa,
    },
  });

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { paidPaisa: applied.paidPaisa, status: applied.status },
  });

  const queues = getQueues();
  await queues.messaging.add(
    "payment-receipt",
    {
      institutionId: invoice.institutionId,
      paymentId: payment.id,
      invoiceId: invoice.id,
      idempotencyKey: `receipt:${payment.id}`,
    },
    { jobId: `receipt:${payment.id}` },
  );

  return NextResponse.json({ ok: true, paymentId: payment.id });
}
