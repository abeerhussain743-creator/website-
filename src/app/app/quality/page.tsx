"use client";

import { TopBar } from "@/components/layout/TopBar";
import { MetricCard, PageHeaderNote, SectionCard, StatusBadge } from "@/components/ui/Primitives";
import { useForge } from "@/lib/store";
import { num } from "@/lib/format";

export default function QualityPage() {
  const { data } = useForge();
  const rejected = data.qualityChecks.reduce((s, q) => s + q.rejected, 0);
  const inspected = data.qualityChecks.reduce((s, q) => s + q.inspected, 0);
  const rate = inspected ? ((rejected / inspected) * 100).toFixed(1) : "0";

  return (
    <div className="fade-up">
      <TopBar
        title="Quality Control"
        subtitle="Incoming, in-process, final, and dispatch inspection with scrap and corrective actions."
      />
      <PageHeaderNote>Phase 2 module · Demo data active for Apex Metalworks QC checkpoints.</PageHeaderNote>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Checks logged" value={num(data.qualityChecks.length)} />
        <MetricCard label="Units inspected" value={num(inspected)} />
        <MetricCard label="Units rejected" value={num(rejected)} tone="bad" />
        <MetricCard label="Rejection rate" value={`${rate}%`} tone="warn" />
      </div>

      <SectionCard title="Quality checkpoints" className="mt-5">
        <div className="flex flex-wrap gap-2">
          {["Raw Material Inspection", "Production Inspection", "Final Inspection", "Dispatch Approval"].map(
            (step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <span className="rounded-full bg-[rgba(19,78,94,0.08)] px-3 py-2 text-xs font-semibold text-[var(--steel)]">
                  {step}
                </span>
                {i < arr.length - 1 ? <span className="text-[var(--ink-soft)]">→</span> : null}
              </div>
            )
          )}
        </div>
      </SectionCard>

      <SectionCard title="Inspection log" className="mt-5">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Stage</th>
                <th>Batch</th>
                <th>Inspector</th>
                <th>Inspected</th>
                <th>Rejected</th>
                <th>Defect</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.qualityChecks.map((q) => (
                <tr key={q.id}>
                  <td className="font-semibold">{q.reference}</td>
                  <td>{q.stage.replaceAll("_", " ")}</td>
                  <td>{q.batch}</td>
                  <td>{q.inspector}</td>
                  <td>{num(q.inspected)}</td>
                  <td className={q.rejected ? "font-semibold text-[var(--bad)]" : ""}>
                    {num(q.rejected)}
                  </td>
                  <td className="max-w-[180px] text-sm">{q.defect ?? "—"}</td>
                  <td>
                    <StatusBadge status={q.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
