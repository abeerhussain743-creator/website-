"use client";

import { TopBar } from "@/components/layout/TopBar";
import { MetricCard, PageHeaderNote, SectionCard, StatusBadge } from "@/components/ui/Primitives";
import { useForge } from "@/lib/store";
import { materialRequirements } from "@/lib/seed";
import { moneyExact, num } from "@/lib/format";

export default function ProductionPage() {
  const { data, startProduction, createPurchaseFromShortage, completeProduction } = useForge();
  const focus = data.productionOrders.find((p) => p.number === "PR-1026") ?? data.productionOrders[0];
  const bom = data.boms.find((b) => b.productId === focus.productId);
  const requirements = bom
    ? materialRequirements(bom.lines, focus.quantity, data.products)
    : [];
  const stages = ["Cutting", "Machining", "Assembly", "Painting", "Quality Control", "Packaging"];

  return (
    <div className="fade-up">
      <TopBar
        title="Production / Manufacturing"
        subtitle="BOM explosion, material readiness, work orders, machines, and maintenance."
      />
      <PageHeaderNote>
        Manufacturing-specific core · Open PR-1026 to explode BOM, detect steel shortage, and
        auto-create a purchase request.
      </PageHeaderNote>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="In production"
          value={num(data.productionOrders.filter((p) => p.status === "in_production").length)}
        />
        <MetricCard
          label="Delayed"
          value={num(data.productionOrders.filter((p) => p.status === "delayed").length)}
          tone="bad"
        />
        <MetricCard
          label="Machines running"
          value={num(data.machines.filter((m) => m.status === "running").length)}
          tone="ok"
        />
        <MetricCard label="Open maintenance" value={num(data.maintenance.filter((m) => m.status !== "closed").length)} tone="warn" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title={`Material check · ${focus.number}`}
          action={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary py-2 text-sm"
                onClick={() => createPurchaseFromShortage(focus.id)}
              >
                Create purchase from shortage
              </button>
              <button
                type="button"
                className="btn btn-primary py-2 text-sm"
                onClick={() => startProduction(focus.id)}
              >
                Start production
              </button>
              <button
                type="button"
                className="btn btn-signal py-2 text-sm"
                onClick={() => completeProduction(focus.id)}
              >
                Complete → FG
              </button>
            </div>
          }
        >
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[var(--surface-2)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Materials</p>
              <p className="mt-1 font-semibold">{focus.materialsReady ? "READY" : "SHORTAGE"}</p>
            </div>
            <div className="rounded-xl bg-[var(--surface-2)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Machine</p>
              <p className="mt-1 font-semibold">{focus.machineReady ? "AVAILABLE" : "BLOCKED"}</p>
            </div>
            <div className="rounded-xl bg-[var(--surface-2)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Labor</p>
              <p className="mt-1 font-semibold">{focus.laborReady ? "AVAILABLE" : "BLOCKED"}</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Per unit</th>
                  <th>Required</th>
                  <th>Available</th>
                  <th>Shortage</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((r) => (
                  <tr key={r.productId}>
                    <td className="font-semibold">{r.name}</td>
                    <td>
                      {r.perUnit} {r.unit}
                    </td>
                    <td>
                      {num(r.required)} {r.unit}
                    </td>
                    <td>
                      {num(r.available)} {r.unit}
                    </td>
                    <td className={r.shortage ? "font-bold text-[var(--bad)]" : "text-[var(--ok)]"}>
                      {r.shortage ? `${num(r.shortage)} ${r.unit}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Bill of materials">
          <div className="space-y-4">
            {data.boms.map((b) => {
              const product = data.products.find((p) => p.id === b.productId);
              const materialCost = b.lines.reduce((sum, line) => {
                const mat = data.products.find((p) => p.id === line.productId);
                return sum + (mat?.unitCost ?? 0) * line.quantity;
              }, 0);
              return (
                <div key={b.id} className="rounded-xl border border-[var(--line)] bg-white/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{product?.name}</p>
                      <p className="muted text-xs">
                        {product?.sku} · BOM {b.version}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--ink-soft)]">Material cost</p>
                      <p className="display text-lg font-bold">{moneyExact(materialCost)}</p>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm">
                    {b.lines.map((line) => {
                      const mat = data.products.find((p) => p.id === line.productId);
                      return (
                        <li key={line.productId} className="flex justify-between">
                          <span>{mat?.name}</span>
                          <span className="font-medium">
                            {line.quantity} {mat?.unit}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {product?.sellPrice ? (
                    <p className="muted mt-3 text-xs">
                      Sell {moneyExact(product.sellPrice)} · Material margin{" "}
                      {(((product.sellPrice - materialCost) / product.sellPrice) * 100).toFixed(0)}%
                      before labor/machine/overhead
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Production orders" className="mt-5">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Order</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Deadline</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.productionOrders.map((p) => {
                const product = data.products.find((x) => x.id === p.productId);
                const blocked = data.qcBlocks.includes(p.number) || data.qcBlocks.includes(p.id);
                return (
                  <tr key={p.id}>
                    <td className="font-semibold">
                      {p.number}
                      {blocked ? <span className="ml-2 badge tone-bad">qc block</span> : null}
                    </td>
                    <td>{product?.name}</td>
                    <td>{num(p.quantity)}</td>
                    <td>{p.deadline}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="progress w-28">
                          <span style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-xs">{p.progress}%</span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td>
                      {p.status !== "completed" ? (
                        <button
                          type="button"
                          className="btn btn-secondary py-1 text-xs"
                          onClick={() => completeProduction(p.id)}
                        >
                          Complete
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <SectionCard title="Work order stages · PR-1019">
          <div className="space-y-2">
            {stages.map((stage, i) => {
              const wo = data.workOrders.find(
                (w) => w.productionOrderId === "pr3" && w.stage === stage
              );
              return (
                <div
                  key={stage}
                  className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3"
                >
                  <div>
                    <p className="text-xs text-[var(--ink-soft)]">Step {i + 1}</p>
                    <p className="font-semibold">{stage}</p>
                    {wo?.assignee ? (
                      <p className="muted text-xs">{wo.assignee}</p>
                    ) : null}
                  </div>
                  <StatusBadge status={wo?.status ?? "pending"} />
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Machines & maintenance">
          <div className="space-y-3">
            {data.machines.map((m) => (
              <div key={m.id} className="rounded-xl border border-[var(--line)] bg-white/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{m.name}</p>
                    <p className="muted text-xs">{m.location}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-[var(--ink-soft)]">Runtime</p>
                    <p className="font-semibold">{m.runtimeHours}h</p>
                  </div>
                  <div>
                    <p className="text-[var(--ink-soft)]">Efficiency</p>
                    <p className="font-semibold">{m.efficiency}%</p>
                  </div>
                  <div>
                    <p className="text-[var(--ink-soft)]">Next PM</p>
                    <p className="font-semibold">{m.nextMaintenanceHours}h</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {data.maintenance.map((mt) => {
              const machine = data.machines.find((m) => m.id === mt.machineId);
              return (
                <div key={mt.id} className="rounded-xl bg-[var(--surface-2)] p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">
                      {mt.type} · {machine?.name}
                    </p>
                    <StatusBadge status={mt.status} />
                  </div>
                  <p className="muted mt-1 text-xs">{mt.problem}</p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
