import { requireSession } from "@/lib/access";
import { getPrimaryWorkspaceForUser } from "@/lib/tenancy";
import { prisma } from "@postpilot/db";

export default async function TrendsPage() {
  const session = await requireSession();
  const workspace = await getPrimaryWorkspaceForUser(session.user.id);
  const playbook = await prisma.nichePlaybook.findFirst({
    where: { workspaceId: workspace.id, isActive: true },
  });
  const outliers = await prisma.competitorPost.findMany({
    where: {
      isOutlier: true,
      competitor: { workspaceId: workspace.id, deletedAt: null },
    },
    take: 12,
    orderBy: { engagementTotal: "desc" },
    include: { competitor: true },
  });

  const themes = (playbook?.trendingThemes as string[]) ?? [];
  const gaps = (playbook?.contentGaps as string[]) ?? [];
  const hooks = (playbook?.hookPatterns as string[]) ?? [];
  const changed = (playbook?.whatChanged as string[]) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Trend Radar</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Niche themes, content gaps, and outlier posts from competitor intelligence.
        </p>
      </div>

      {!playbook ? (
        <p className="text-sm text-[var(--muted)]">
          Run the weekly pipeline to populate niche signals.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="font-medium">Trending themes</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {themes.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="font-medium">Content gaps</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {gaps.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="font-medium">Winning hooks</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {hooks.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="font-medium">What changed</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {changed.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <section>
        <h2 className="font-medium">Outlier posts</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {outliers.map((o) => (
            <article
              key={o.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm"
            >
              <p className="text-xs text-[var(--muted)]">
                @{o.competitor.handle} · {o.format}
              </p>
              <p className="mt-1">{o.caption}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {o.engagementTotal} eng · {o.outlierReason}
              </p>
            </article>
          ))}
          {outliers.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No outliers yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
