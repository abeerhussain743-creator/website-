"use client";

import { TopBar } from "@/components/layout/TopBar";
import { MetricCard, PageHeaderNote, SectionCard } from "@/components/ui/Primitives";
import { useForge } from "@/lib/store";
import { availableQty } from "@/lib/seed";
import { num } from "@/lib/format";

export default function WarehousePage() {
  const { data } = useForge();
  const finished = data.products.filter((p) => p.category === "finished_goods");
  const readyToShip = finished.reduce((s, p) => s + availableQty(p), 0);

  return (
    <div className="fade-up">
      <TopBar
        title="Warehouse & Dispatch"
        subtitle="Multi-warehouse stock, transfers, picking, packing, dispatch, and returns."
      />
      <PageHeaderNote>Phase 2 module · Multi-warehouse topology with zone-level visibility.</PageHeaderNote>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Warehouses" value={num(data.warehouses.length)} />
        <MetricCard label="Finished available" value={num(readyToShip)} tone="ok" />
        <MetricCard label="Dispatch-ready SOs" value="2" />
        <MetricCard label="Open transfers" value="1" tone="warn" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {data.warehouses.map((w) => (
          <SectionCard key={w.id} title={w.name}>
            <div className="space-y-3">
              {w.zones.map((zone) => {
                const skus = data.products.filter(
                  (p) =>
                    p.warehouse === w.name &&
                    ((zone.includes("Raw") && p.category === "raw_material") ||
                      (zone.includes("WIP") && p.category === "wip") ||
                      (zone.includes("Finished") && p.category === "finished_goods") ||
                      (zone.includes("Packaging") && p.category === "packaging") ||
                      zone.includes("Returns"))
                );
                return (
                  <div key={zone} className="rounded-xl border border-[var(--line)] bg-white/70 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{zone}</p>
                      <span className="text-xs text-[var(--ink-soft)]">{skus.length} SKUs</span>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm">
                      {skus.slice(0, 3).map((s) => (
                        <li key={s.id} className="flex justify-between">
                          <span>{s.name}</span>
                          <span className="font-medium">
                            {num(availableQty(s))} {s.unit}
                          </span>
                        </li>
                      ))}
                      {skus.length === 0 ? (
                        <li className="muted text-xs">No active SKUs in zone</li>
                      ) : null}
                    </ul>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        ))}
      </div>

      <SectionCard title="Outbound flow" className="mt-5">
        <div className="flex flex-wrap gap-2">
          {["Receiving", "Putaway", "Picking", "Packing", "Dispatch", "Returns"].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <span className="rounded-full bg-[rgba(19,78,94,0.08)] px-3 py-2 text-xs font-semibold text-[var(--steel)]">
                {step}
              </span>
              {i < arr.length - 1 ? <span className="text-[var(--ink-soft)]">→</span> : null}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
