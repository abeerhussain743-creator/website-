import { requireSession } from "@/lib/access";
import { getPrimaryWorkspaceForUser } from "@/lib/tenancy";
import { prisma } from "@postpilot/db";

export default async function AnalyticsPage() {
  const session = await requireSession();
  const workspace = await getPrimaryWorkspaceForUser(session.user.id);
  const published = await prisma.publishedPost.findMany({
    where: { plannedPost: { workspaceId: workspace.id } },
    include: {
      metrics: { orderBy: { capturedAt: "desc" }, take: 4 },
      plannedPost: true,
    },
    orderBy: { publishedAt: "desc" },
    take: 20,
  });
  const stage = await prisma.stageReport.findFirst({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });

  const latestMetrics = published.flatMap((p) => p.metrics.slice(0, 1));
  const avgReach =
    latestMetrics.reduce((a, m) => a + (m.reach ?? 0), 0) /
    Math.max(latestMetrics.length, 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Analytics</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Post metrics feed the learning loop for next week&apos;s plan.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card label="Published posts" value={String(published.length)} />
        <Card label="Avg reach (latest)" value={avgReach ? avgReach.toFixed(0) : "—"} />
        <Card label="Stage" value={stage?.stage ?? "—"} />
      </div>
      <div className="space-y-3">
        {published.map((p) => {
          const m = p.metrics[0];
          return (
            <div
              key={p.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium">{p.plannedPost.topic}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {p.platform} · {p.platformPostId}
                  </p>
                </div>
                <a
                  className="text-sm text-ember-600 underline-offset-4 hover:underline"
                  href={p.platformUrl ?? "#"}
                >
                  View
                </a>
              </div>
              {m ? (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Reach {m.reach} · Likes {m.likes} · Saves {m.saves} · Comments{" "}
                  {m.comments} ({m.timepoint})
                </p>
              ) : (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Metrics pending…
                </p>
              )}
            </div>
          );
        })}
        {!published.length ? (
          <p className="text-sm text-[var(--muted)]">
            Publish approved posts to start collecting metrics.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-xs uppercase text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-medium">{value}</p>
    </div>
  );
}
