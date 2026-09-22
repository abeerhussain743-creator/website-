import { requireTenantContext } from "@/lib/tenant";
import { formatPkr } from "@maxtrone/core";
import { BroadcastComposer } from "./broadcast-composer";

export default async function BroadcastsPage() {
  const { db } = await requireTenantContext();
  const broadcasts = await db.broadcast.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Broadcasts</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Audience builder · per-language send · cost meter
        </p>
      </div>
      <BroadcastComposer />
      <ul className="space-y-2">
        {broadcasts.map((b) => (
          <li
            key={b.id}
            className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm"
          >
            <span className="font-medium">{b.title}</span>
            <span className="ml-2 text-[var(--muted-foreground)]">{b.status}</span>
            {b.estimatedCostPaisa != null ? (
              <span className="ml-2 tabular-nums text-[var(--gold-dark)]">
                {formatPkr(b.estimatedCostPaisa)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
