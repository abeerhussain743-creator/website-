import { NextRequest, NextResponse } from "next/server";
import { requireApiTenant } from "@/lib/api-auth";
import {
  applyPaymentToInvoice,
} from "@maxtrone/core";
import { getQueues } from "@/lib/queues";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ctx = await requireApiTenant(req, "fees.read");
  if ("error" in ctx && ctx.error) return ctx.error;
  const { db } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const invoices = await db.invoice.findMany({
    where: { deletedAt: null },
    orderBy: { dueDate: "desc" },
    take: 100,
  });
  const payments = await db.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const collected = payments
    .filter((p) => p.status === "SUCCEEDED" && p.receivedAt && p.receivedAt >= monthStart)
    .reduce((s, p) => s + p.amountPaisa, 0);
  const outstanding = invoices
    .filter((i) => i.status === "ISSUED" || i.status === "PARTIALLY_PAID" || i.status === "OVERDUE")
    .reduce((s, i) => s + (i.totalPaisa - i.paidPaisa), 0);

  const aging = { d0_30: 0, d31_60: 0, d61_90: 0, d90p: 0 };
  for (const inv of invoices) {
    const bal = inv.totalPaisa - inv.paidPaisa;
    if (bal <= 0) continue;
    const days = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000);
    if (days <= 30) aging.d0_30 += bal;
    else if (days <= 60) aging.d31_60 += bal;
    else if (days <= 90) aging.d61_90 += bal;
    else aging.d90p += bal;
  }

  return NextResponse.json({
    invoices,
    payments,
    kpis: { collected, outstanding, aging },
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiTenant(req, "fees.write");
  if ("error" in ctx && ctx.error) return ctx.error;
  const { db, institution, session } = ctx as Exclude<typeof ctx, { error: NextResponse }>;
  const body = await req.json();

  if (body.action === "generate_monthly") {
    const queues = getQueues();
    await queues.invoices.add(
      "generate-monthly",
      {
        institutionId: institution.id,
        idempotencyKey: `invgen:${institution.id}:${body.period ?? "current"}`,
      },
      {
        jobId: `invgen:${institution.id}:${body.period ?? new Date().toISOString().slice(0, 7)}`,
        attempts: 3,
      },
    );
    return NextResponse.json({ queued: true });
  }

  if (body.action === "callback") {
    // Idempotent payment callback simulation
    const key = String(body.idempotencyKey || body.providerPaymentId);
    const existing = await db.payment.findFirst({
      where: { idempotencyKey: key },
    });
    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true, paymentId: existing.id });
    }

    const invoice = await db.invoice.findFirst({ where: { id: body.invoiceId } });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const amountPaisa = Number(body.amountPaisa || 0);
    const applied = applyPaymentToInvoice({
      totalPaisa: invoice.totalPaisa,
      paidPaisa: invoice.paidPaisa,
      paymentPaisa: amountPaisa,
    });

    const payment = await db.payment.create({
      data: {
        studentId: invoice.studentId,
        channel: body.channel ?? "JAZZCASH",
        status: "SUCCEEDED",
        amountPaisa: applied.appliedPaisa,
        providerPaymentId: body.providerPaymentId ?? key,
        idempotencyKey: key,
        receivedAt: new Date(),
      } as never,
    });

    await db.paymentAllocation.create({
      data: {
        paymentId: payment.id,
        invoiceId: invoice.id,
        amountPaisa: applied.appliedPaisa,
      } as never,
    });

    await db.invoice.update({
      where: { id: invoice.id },
      data: { paidPaisa: applied.paidPaisa, status: applied.status },
    });

    await writeAudit({
      institutionId: institution.id,
      actorId: session.user.id,
      action: "payment.callback",
      entityType: "Payment",
      entityId: payment.id,
    });

    return NextResponse.json({ ok: true, paymentId: payment.id, duplicate: false });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
