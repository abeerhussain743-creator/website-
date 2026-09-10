"use client";

import { TopBar } from "@/components/layout/TopBar";
import { MetricCard, PageHeaderNote, SectionCard, StatusBadge } from "@/components/ui/Primitives";
import { useForge } from "@/lib/store";
import { num } from "@/lib/format";

export default function DecisionsPage() {
  const {
    data,
    runRules,
    analyze,
    autoExecute,
    approveDecision,
    rejectDecision,
    executeDecision,
    overrideDecision,
    updateSettings,
  } = useForge();

  const open = data.decisions.filter((d) => ["proposed", "approved"].includes(d.status));
  const executed = data.decisions.filter((d) => d.status === "executed");
  const settings = data.decisionSettings;

  return (
    <div className="fade-up">
      <TopBar
        title="Decision Center"
        subtitle="Rules + AI propose actions. Approve, execute, or override — this is what makes Forge more than a data store."
      />
      <PageHeaderNote>
        Phase 2–4 live · Rule engine (shortage, overdue hold, QC block, maintenance, margin) · AI
        analysis · Human-in-the-loop execution with optional auto-run.
      </PageHeaderNote>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Open decisions" value={num(open.length)} tone="warn" />
        <MetricCard label="Executed" value={num(executed.length)} tone="ok" />
        <MetricCard label="Dispatch holds" value={num(data.dispatchHolds.length)} tone="bad" />
        <MetricCard label="QC blocks" value={num(data.qcBlocks.length)} tone="bad" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={() => runRules()}>
          Run rule engine
        </button>
        <button type="button" className="btn btn-signal" onClick={() => analyze()}>
          AI analyze + propose
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => autoExecute()}>
          Auto-execute eligible
        </button>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <SectionCard title="Action queue">
          <div className="space-y-3">
            {data.decisions.length === 0 ? (
              <p className="muted text-sm">
                No decisions yet. Click <strong>Run rule engine</strong> or{" "}
                <strong>AI analyze</strong>.
              </p>
            ) : (
              data.decisions.slice(0, 20).map((d) => (
                <div key={d.id} className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{d.title}</p>
                      <p className="muted mt-1 text-xs leading-relaxed">{d.reason}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge status={d.status} />
                      <StatusBadge status={d.severity} />
                      <span className="badge tone-muted">{d.source}</span>
                    </div>
                  </div>
                  {d.resultMessage ? (
                    <p className="mt-2 text-xs font-semibold text-[var(--ok)]">{d.resultMessage}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {d.status === "proposed" ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary py-1.5 text-xs"
                          onClick={() => approveDecision(d.id)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary py-1.5 text-xs"
                          onClick={() => executeDecision(d.id)}
                        >
                          Execute
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost py-1.5 text-xs"
                          onClick={() => rejectDecision(d.id)}
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                    {d.status === "approved" ? (
                      <button
                        type="button"
                        className="btn btn-primary py-1.5 text-xs"
                        onClick={() => executeDecision(d.id)}
                      >
                        Execute approved
                      </button>
                    ) : null}
                    {["executed", "proposed", "approved"].includes(d.status) &&
                    ["hold_dispatch", "credit_hold", "block_qc_release"].includes(d.type) ? (
                      <button
                        type="button"
                        className="btn btn-signal py-1.5 text-xs"
                        onClick={() => overrideDecision(d.id)}
                      >
                        Human override
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Autonomy settings">
          <div className="space-y-3 text-sm">
            {(
              [
                ["autoExecute", "Auto-execute eligible (non-critical if required)"],
                ["requireApprovalForCritical", "Require approval for critical actions"],
                ["enableShortageRule", "Shortage → purchase request"],
                ["enableOverdueHoldRule", "Overdue AR → dispatch hold"],
                ["enableQcBlockRule", "Failed QC → release block"],
                ["enableMaintenanceRule", "Machine PM window → schedule"],
                ["enableMarginRule", "Margin drop → flag"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5"
              >
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings[key])}
                  onChange={(e) => updateSettings({ [key]: e.target.checked })}
                />
              </label>
            ))}
          </div>
          <p className="muted mt-4 text-xs leading-relaxed">
            With auto-execute on and critical approval required, Forge runs safe actions alone and
            waits for a human on credit/dispatch/QC criticals — the Odoo/SAP data layer plus a
            decision layer.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
