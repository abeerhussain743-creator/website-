import Link from "next/link";
import { formatPkr } from "@maxtrone/core";
import { Button, Kpi } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";
import { recordCashPayment } from "@/actions/campus";

export default async function FeesPage() {
  const { db } = await requireTenantContext();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [structures, invoices, payments] = await Promise.all([
    db.feeStructure.findMany({ where: { deletedAt: null }, include: { feeHead: true } }),
    db.invoice.findMany({
      where: { deletedAt: null },
      orderBy: { dueDate: "desc" },
      take: 50,
      include: { student: true },
    }),
    db.payment.findMany({
      where: { status: "SUCCEEDED", receivedAt: { gte: monthStart } },
    }),
  ]);

  const collected = payments.reduce((s, p) => s + p.amountPaisa, 0);
  const outstanding = invoices
    .filter((i) => i.status !== "PAID" && i.status !== "VOID")
    .reduce((s, i) => s + (i.totalPaisa - i.paidPaisa), 0);

  const recoveryTouched = await db.recoveryRun.count({
    where: { sentAt: { gte: monthStart } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Fees</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Structures · invoices · recovery ladder (text)
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            const { getQueues } = await import("@/lib/queues");
            const { requireTenantContext } = await import("@/lib/tenant");
            const { institution } = await requireTenantContext();
            await getQueues().invoices.add(
              "generate-monthly",
              { institutionId: institution.id },
              { jobId: `invgen:${institution.id}:${new Date().toISOString().slice(0, 7)}` },
            );
          }}
        >
          <Button type="submit">Generate monthly invoices</Button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Collected this month" value={formatPkr(collected)} />
        <Kpi label="Outstanding" value={formatPkr(outstanding)} />
        <Kpi label="Recovery touches" value={String(recoveryTouched)} hint="Automation ladder" />
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Fee structures</h2>
        {structures.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            No structures yet — seed or create tuition heads for classes.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {structures.map((s) => (
              <li key={s.id} className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="ml-2 text-[var(--muted-foreground)]">{s.feeHead.kind}</span>
                <p className="mt-1 tabular-nums text-[var(--gold-dark)]">{formatPkr(s.amountPaisa)} / {s.frequency}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Invoices</h2>
        <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pay</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3 font-medium">{inv.number}</td>
                  <td className="px-4 py-3">{inv.student.fullName}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {new Date(inv.dueDate).toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatPkr(inv.totalPaisa - inv.paidPaisa)}
                  </td>
                  <td className="px-4 py-3">{inv.status}</td>
                  <td className="px-4 py-3">
                    {inv.paymentLinkToken ? (
                      <Link className="underline" href={`/pay/${inv.paymentLinkToken}`}>
                        Link
                      </Link>
                    ) : null}
                    {inv.status !== "PAID" ? (
                      <form action={recordCashPayment} className="mt-1 flex gap-1">
                        <input type="hidden" name="invoiceId" value={inv.id} />
                        <input
                          name="amountPkr"
                          type="number"
                          step="1"
                          placeholder="PKR"
                          className="h-8 w-24 rounded-[8px] border border-[var(--border)] px-2 text-xs"
                        />
                        <button type="submit" className="rounded-[8px] bg-[var(--ink)] px-2 text-xs text-[var(--ivory)]">
                          Cash
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
