import { Button, EmptyState, Kpi } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";
import { runRiskScoringNow } from "@/actions/phase23";

export default async function RiskPage() {
  const { db } = await requireTenantContext();
  const scores = await db.riskScore.findMany({
    orderBy: [{ score: "desc" }, { scoredAt: "desc" }],
    include: { student: true },
    take: 50,
  });

  const high = scores.filter((s) => s.score >= 70).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">At-risk students</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Explainable withdrawal early-warning scores
          </p>
        </div>
        <form action={runRiskScoringNow}>
          <Button type="submit">Run scoring</Button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Kpi label="Scored (latest batch)" value={String(scores.length)} />
        <Kpi label="High risk (≥70)" value={String(high)} />
      </div>

      {scores.length === 0 ? (
        <EmptyState title="No scores yet" description="Run the daily risk job to populate reasons and actions." />
      ) : (
        <ul className="space-y-3">
          {scores.map((s) => (
            <li key={s.id} className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-medium">{s.student.fullName}</p>
                <p className="font-display text-2xl tabular-nums text-[var(--gold-dark)]">{s.score}</p>
              </div>
              <p className="mt-2 text-sm text-[var(--body)]">{s.reasons.join(" · ")}</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Suggested: {s.suggestedAction}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
