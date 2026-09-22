import { formatPkr } from "@maxtrone/core";
import { Button, EmptyState, Kpi } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";
import { generateMonthlyRoiNow } from "@/actions/phase23";

export default async function RoiPage() {
  const { db } = await requireTenantContext();
  const reports = await db.monthlyReport.findMany({
    orderBy: { period: "desc" },
    take: 12,
  });
  const latest = reports[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Monthly ROI</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Headline rupee figure sent to the owner on the 1st
          </p>
        </div>
        <form action={generateMonthlyRoiNow}>
          <Button type="submit">Generate this month</Button>
        </form>
      </div>

      {latest ? (
        <div className="space-y-4">
          <Kpi
            label={latest.period}
            value={formatPkr(latest.headlinePaisa)}
            hint={(latest.summary as { headlineText?: string })?.headlineText}
          />
          <pre className="overflow-auto rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4 text-xs">
            {JSON.stringify(latest.summary, null, 2)}
          </pre>
        </div>
      ) : (
        <EmptyState title="No ROI reports" description="Generate one to see admissions, recovery and tutor impact." />
      )}

      {reports.length > 1 && (
        <ul className="space-y-2 text-sm">
          {reports.slice(1).map((r) => (
            <li key={r.id} className="flex justify-between rounded-[12px] border border-[var(--border)] px-3 py-2">
              <span>{r.period}</span>
              <span className="tabular-nums">{formatPkr(r.headlinePaisa)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
