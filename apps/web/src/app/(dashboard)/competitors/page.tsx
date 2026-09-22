import { Button, EmptyState } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";
import { upsertCompetitor } from "@/actions/phase23";

export default async function CompetitorsPage() {
  const { db } = await requireTenantContext();
  const watches = await db.competitorWatch.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Competitor watch</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Nearby fees, batches and ads
        </p>
      </div>

      <form action={upsertCompetitor} className="grid gap-2 md:grid-cols-2">
        <input name="name" required placeholder="Competitor name" className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
        <input name="area" placeholder="Area" className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
        <input name="feeNotes" placeholder="Fee notes" className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
        <input name="batchNotes" placeholder="Batch notes" className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
        <input name="adNotes" placeholder="Ad notes" className="md:col-span-2 rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
        <Button type="submit">Add watch</Button>
      </form>

      {watches.length === 0 ? (
        <EmptyState title="No competitors tracked" description="Add nearby institutions to compare fees and batches." />
      ) : (
        <ul className="space-y-3">
          {watches.map((w) => (
            <li key={w.id} className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
              <p className="font-medium">{w.name}</p>
              <p className="text-[var(--muted-foreground)]">{w.area}</p>
              <p className="mt-2">Fees: {w.feeNotes ?? "—"}</p>
              <p>Batches: {w.batchNotes ?? "—"}</p>
              <p>Ads: {w.adNotes ?? "—"}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
