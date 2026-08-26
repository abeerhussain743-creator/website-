"use client";

import { TopBar } from "@/components/layout/TopBar";
import { MetricCard, PageHeaderNote, SectionCard, StatusBadge } from "@/components/ui/Primitives";
import { useForge } from "@/lib/store";
import { money, moneyExact, num } from "@/lib/format";

export default function AccountsPage() {
  const { data } = useForge();
  const ar = data.invoices.filter((i) => i.type === "receivable" && i.status !== "paid");
  const ap = data.invoices.filter((i) => i.type === "payable" && i.status !== "paid");
  const cash = data.bankAccounts.reduce((s, b) => s + b.balance, 0);

  const bracketBom = data.boms.find((b) => b.productId === "p_bracket");
  const material =
    bracketBom?.lines.reduce((sum, line) => {
      const p = data.products.find((x) => x.id === line.productId);
      return sum + (p?.unitCost ?? 0) * line.quantity;
    }, 0) ?? 0;
  const labor = 5;
  const machine = 3;
  const overhead = 2;
  const totalCost = material + labor + machine + overhead;
  const sell = data.products.find((p) => p.id === "p_bracket")?.sellPrice ?? 40;

  return (
    <div className="fade-up">
      <TopBar
        title="Accounts & Finance"
        subtitle="Receivables, payables, banking, inventory valuation, and product costing."
      />
      <PageHeaderNote>
        Phase 1 basic accounts + costing engine preview · Sales, purchase, and inventory post into
        one financial picture.
      </PageHeaderNote>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Cash & banks" value={money(cash)} tone="ok" />
        <MetricCard
          label="Receivables"
          value={money(ar.reduce((s, i) => s + (i.amount - i.paid), 0))}
          tone="warn"
        />
        <MetricCard
          label="Payables"
          value={money(ap.reduce((s, i) => s + (i.amount - i.paid), 0))}
        />
        <MetricCard label="Open invoices" value={num(ar.length + ap.length)} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Invoices & bills">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Type</th>
                  <th>Party</th>
                  <th>Due</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-semibold">{inv.number}</td>
                    <td className="capitalize">{inv.type}</td>
                    <td>{inv.partyName}</td>
                    <td>{inv.dueDate}</td>
                    <td>{moneyExact(inv.amount)}</td>
                    <td>
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="Banking">
            <div className="space-y-3">
              {data.bankAccounts.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{b.name}</p>
                    <p className="muted text-xs capitalize">{b.type}</p>
                  </div>
                  <p className="display text-xl font-bold">{money(b.balance)}</p>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-[var(--line)] pt-3">
                <span className="font-semibold">Total</span>
                <span className="display text-2xl font-bold">{money(cash)}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Costing · Mounting Bracket A">
            <div className="space-y-2 text-sm">
              {[
                ["Raw material", material],
                ["Labor", labor],
                ["Machine", machine],
                ["Overhead", overhead],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <span className="muted">{label}</span>
                  <span className="font-semibold">{moneyExact(value as number)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-[var(--line)] pt-2">
                <span className="font-semibold">Manufacturing cost</span>
                <span className="display text-lg font-bold">{moneyExact(totalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted">Selling price</span>
                <span>{moneyExact(sell)}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted">Gross profit</span>
                <span className="font-semibold text-[var(--ok)]">
                  {moneyExact(sell - totalCost)} · {(((sell - totalCost) / sell) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
