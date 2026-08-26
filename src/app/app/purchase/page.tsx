"use client";

import { TopBar } from "@/components/layout/TopBar";
import { MetricCard, PageHeaderNote, SectionCard, StatusBadge } from "@/components/ui/Primitives";
import { useForge } from "@/lib/store";
import { money, moneyExact, num } from "@/lib/format";

export default function PurchasePage() {
  const { data } = useForge();
  const flow = [
    "Material requirement",
    "Purchase request",
    "Approval",
    "RFQ",
    "Supplier compare",
    "PO",
    "GRN",
    "QC",
    "Inventory",
    "Invoice",
    "Payment",
  ];

  return (
    <div className="fade-up">
      <TopBar
        title="Purchase"
        subtitle="From material shortage to supplier payment — the manufacturing buy side."
      />
      <PageHeaderNote>
        Critical manufacturing workflow · Shortage-driven POs can be generated from Production when
        BOM materials are insufficient.
      </PageHeaderNote>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Open POs" value={num(data.purchaseOrders.filter((p) => !["paid"].includes(p.status)).length)} />
        <MetricCard label="Suppliers" value={num(data.suppliers.length)} />
        <MetricCard
          label="PO value (open)"
          value={money(
            data.purchaseOrders
              .filter((p) => !["paid"].includes(p.status))
              .reduce((s, p) => s + p.total, 0)
          )}
        />
        <MetricCard
          label="Avg supplier lead time"
          value={`${Math.round(
            data.suppliers.reduce((s, x) => s + x.leadTimeDays, 0) / data.suppliers.length
          )} days`}
        />
      </div>

      <SectionCard title="Purchase workflow" className="mt-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {flow.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span className="whitespace-nowrap rounded-full bg-[rgba(184,146,90,0.12)] px-3 py-2 text-xs font-semibold text-[var(--steel)]">
                {step}
              </span>
              {i < flow.length - 1 ? <span className="text-[var(--ink-soft)]">→</span> : null}
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <SectionCard title="Purchase orders">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>PO</th>
                  <th>Supplier</th>
                  <th>Expected</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.purchaseOrders.map((po) => {
                  const supplier = data.suppliers.find((s) => s.id === po.supplierId);
                  return (
                    <tr key={po.id}>
                      <td>
                        <p className="font-semibold">{po.number}</p>
                        <p className="muted text-xs">{po.date}</p>
                      </td>
                      <td>{supplier?.company}</td>
                      <td>{po.expectedDate}</td>
                      <td>{moneyExact(po.total)}</td>
                      <td>
                        <StatusBadge status={po.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Suppliers">
          <div className="space-y-3">
            {data.suppliers.map((s) => (
              <div key={s.id} className="rounded-xl border border-[var(--line)] bg-white/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{s.company}</p>
                    <p className="muted text-xs">
                      {s.contact} · {s.email}
                    </p>
                  </div>
                  <span className="badge tone-ok">{s.rating.toFixed(1)} ★</span>
                </div>
                <div className="mt-3 flex gap-4 text-xs text-[var(--ink-soft)]">
                  <span>Lead {s.leadTimeDays}d</span>
                  <span>{s.paymentTerms}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
