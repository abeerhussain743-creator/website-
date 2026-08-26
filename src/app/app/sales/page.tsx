"use client";

import { TopBar } from "@/components/layout/TopBar";
import { MetricCard, PageHeaderNote, SectionCard, StatusBadge } from "@/components/ui/Primitives";
import { useForge } from "@/lib/store";
import { money, moneyExact, num } from "@/lib/format";
import { quoteTotal } from "@/lib/seed";

export default function SalesPage() {
  const { data, convertQuotation } = useForge();
  const pipeline = [
    "lead",
    "qualified",
    "quotation",
    "negotiation",
    "sales_order",
    "production",
    "dispatch",
    "invoice",
    "payment",
  ] as const;

  return (
    <div className="fade-up">
      <TopBar
        title="CRM & Sales"
        subtitle="Customers, pipeline, quotations, and sales orders — convert without re-keying."
      />
      <PageHeaderNote>
        Phase 1 module · Quotation → Sales Order conversion is live in this demo (try QT-1023 or
        QT-1021).
      </PageHeaderNote>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Customers" value={num(data.customers.length)} />
        <MetricCard
          label="Open quotations"
          value={num(data.quotations.filter((q) => q.status === "sent" || q.status === "accepted").length)}
        />
        <MetricCard
          label="Active sales orders"
          value={num(data.salesOrders.filter((s) => !["paid"].includes(s.status)).length)}
        />
        <MetricCard
          label="AR outstanding"
          value={money(data.customers.reduce((s, c) => s + c.outstanding, 0))}
          tone="warn"
        />
      </div>

      <SectionCard title="Sales pipeline" className="mt-5">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {pipeline.map((stage) => {
            const count = data.customers.filter((c) => c.stage === stage).length;
            return (
              <div
                key={stage}
                className="min-w-[120px] rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3"
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  {stage.replaceAll("_", " ")}
                </p>
                <p className="display mt-2 text-2xl font-bold">{count}</p>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <SectionCard title="Customers">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Stage</th>
                  <th>Outstanding</th>
                  <th>Terms</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <p className="font-semibold">{c.company}</p>
                      <p className="muted text-xs">{c.industry}</p>
                    </td>
                    <td>
                      <p>{c.contact}</p>
                      <p className="muted text-xs">{c.email}</p>
                    </td>
                    <td>
                      <StatusBadge status={c.stage} />
                    </td>
                    <td>{money(c.outstanding)}</td>
                    <td className="text-sm">{c.paymentTerms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Quotations">
          <div className="space-y-4">
            {data.quotations.map((q) => {
              const customer = data.customers.find((c) => c.id === q.customerId);
              const totals = quoteTotal(q);
              return (
                <div key={q.id} className="rounded-xl border border-[var(--line)] bg-white/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {q.number} · {customer?.company}
                      </p>
                      <p className="muted text-xs">
                        Valid through {q.validUntil} · Tax {(q.taxRate * 100).toFixed(0)}% · Discount{" "}
                        {moneyExact(q.discount)}
                      </p>
                    </div>
                    <StatusBadge status={q.status} />
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    {q.lines.map((line) => {
                      const product = data.products.find((p) => p.id === line.productId);
                      return (
                        <div key={line.productId} className="flex justify-between gap-3">
                          <span>
                            {product?.name} · {num(line.quantity)} × {moneyExact(line.unitPrice)}
                          </span>
                          <span className="font-semibold">
                            {moneyExact(line.quantity * line.unitPrice)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
                    <div className="text-sm">
                      <span className="muted">Total </span>
                      <span className="display text-lg font-bold">{moneyExact(totals.total)}</span>
                    </div>
                    {q.status !== "converted" && q.status !== "rejected" ? (
                      <button
                        type="button"
                        className="btn btn-primary py-2 text-sm"
                        onClick={() => convertQuotation(q.id)}
                      >
                        Convert to sales order
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-[var(--ok)]">Converted</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Sales orders" className="mt-5">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due</th>
                <th>Lines</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.salesOrders.map((so) => {
                const customer = data.customers.find((c) => c.id === so.customerId);
                const total = so.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
                return (
                  <tr key={so.id}>
                    <td className="font-semibold">{so.number}</td>
                    <td>{customer?.company}</td>
                    <td>{so.date}</td>
                    <td>{so.dueDate}</td>
                    <td>
                      {so.lines.length} · {money(total)}
                    </td>
                    <td>
                      <StatusBadge status={so.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
