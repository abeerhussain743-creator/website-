import { requireSession } from "@/lib/access";
import { getPrimaryWorkspaceForUser } from "@/lib/tenancy";
import { prisma } from "@postpilot/db";

export default async function CompetitorsPage() {
  const session = await requireSession();
  const workspace = await getPrimaryWorkspaceForUser(session.user.id);
  const competitors = await prisma.competitor.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    include: {
      snapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
      posts: { where: { isOutlier: true }, take: 3, orderBy: { postedAt: "desc" } },
    },
    orderBy: { momentumScore: "desc" },
  });
  const playbook = await prisma.nichePlaybook.findFirst({
    where: { workspaceId: workspace.id, isActive: true },
  });

  const tiers = {
    RISING_STAR: competitors.filter((c) => c.tier === "RISING_STAR"),
    CATEGORY_LEADER: competitors.filter((c) => c.tier === "CATEGORY_LEADER"),
    DIRECT_RIVAL: competitors.filter((c) => c.tier === "DIRECT_RIVAL"),
    WATCHLIST: competitors.filter((c) => c.tier === "WATCHLIST"),
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Competitors</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Rising stars, category leaders, and direct rivals — scored by momentum.
        </p>
      </div>

      {!competitors.length ? (
        <p className="text-sm text-[var(--muted)]">
          Run “Generate next week now” on the dashboard to refresh competitor
          intelligence.
        </p>
      ) : null}

      {Object.entries(tiers).map(([tier, rows]) =>
        rows.length ? (
          <section key={tier}>
            <h2 className="mb-3 font-medium">{tier.replaceAll("_", " ")}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {rows.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">@{c.handle}</p>
                      <p className="text-xs text-[var(--muted)]">{c.platform}</p>
                    </div>
                    <p className="text-sm font-medium text-ember-600">
                      {c.momentumScore?.toFixed(0)} mom
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {(c.metaJson as { why?: string })?.why}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Followers {c.snapshots[0]?.followers?.toLocaleString() ?? "—"} ·
                    ER {c.snapshots[0]?.engagementRate ?? "—"}% · 7d{" "}
                    {c.snapshots[0]?.growth7dPct ?? "—"}%
                  </p>
                  {c.posts[0] ? (
                    <p className="mt-3 text-xs">
                      Outlier: {c.posts[0].outlierReason}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null,
      )}

      {playbook ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-display text-2xl">Niche playbook</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <List
              title="Hook patterns"
              items={(playbook.hookPatterns as string[]) ?? []}
            />
            <List
              title="Content gaps"
              items={(playbook.contentGaps as string[]) ?? []}
            />
            <List
              title="What changed"
              items={(playbook.whatChanged as string[]) ?? []}
            />
            <List
              title="Topic clusters"
              items={(playbook.topicClusters as string[]) ?? []}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
