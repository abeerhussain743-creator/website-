"use client";

import { TopBar } from "@/components/layout/TopBar";
import { MetricCard, PageHeaderNote, SectionCard, StatusBadge } from "@/components/ui/Primitives";
import { useForge } from "@/lib/store";
import { availableQty } from "@/lib/seed";
import { categoryLabels, moneyExact, num } from "@/lib/format";

export default function InventoryPage() {
  const { data } = useForge();
  const products = data.products;
  const low = products.filter((p) => availableQty(p) <= p.reorderPoint && p.reorderPoint > 0);
  const valuation = products.reduce((s, p) => s + p.quantity * p.unitCost, 0);

  const groups = [
    "raw_material",
    "component",
    "wip",
    "finished_goods",
    "packaging",
    "scrap",
  ] as const;

  return (
    <div className="fade-up">
      <TopBar
        title="Inventory / Stores"
        subtitle="Raw materials, WIP, finished goods, and packaging with reservations and reorder logic."
      />
      <PageHeaderNote>
        Strongest Phase 1 differentiator · Available = on-hand − reserved · Reorder alerts feed
        purchase and production planning.
      </PageHeaderNote>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="SKUs" value={num(products.length)} />
        <MetricCard label="Stock valuation" value={moneyExact(valuation)} tone="ok" />
        <MetricCard label="Below reorder" value={num(low.length)} tone="bad" />
        <MetricCard label="Warehouses" value={num(data.warehouses.length)} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => {
          const count = products.filter((p) => p.category === g).length;
          return (
            <div key={g} className="panel-flat p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
                {categoryLabels[g]}
              </p>
              <p className="display mt-2 text-2xl font-bold">{count}</p>
            </div>
          );
        })}
      </div>

      <SectionCard title="SKU ledger" className="mt-5">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Category</th>
                <th>On hand</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Reorder</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const available = availableQty(p);
                const status =
                  p.reorderPoint === 0
                    ? "ok"
                    : available <= p.minStock
                      ? "critical"
                      : available <= p.reorderPoint
                        ? "warning"
                        : "ok";
                return (
                  <tr key={p.id}>
                    <td>
                      <p className="font-semibold">{p.name}</p>
                      <p className="muted text-xs">
                        {p.sku} · {moneyExact(p.unitCost)}/{p.unit}
                      </p>
                    </td>
                    <td>{categoryLabels[p.category]}</td>
                    <td>
                      {num(p.quantity)} {p.unit}
                    </td>
                    <td>
                      {num(p.reserved)} {p.unit}
                    </td>
                    <td className="font-semibold">
                      {num(available)} {p.unit}
                    </td>
                    <td>
                      {p.reorderPoint ? `${num(p.reorderPoint)} ${p.unit}` : "—"}
                    </td>
                    <td className="text-sm">
                      {p.warehouse}
                      <br />
                      <span className="muted text-xs">{p.bin}</span>
                    </td>
                    <td>
                      <StatusBadge
                        status={status === "ok" ? "active" : status === "critical" ? "critical" : "warning"}
                      />
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
