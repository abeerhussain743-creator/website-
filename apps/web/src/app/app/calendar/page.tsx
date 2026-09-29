import { requireSession } from "@/lib/access";
import { getPrimaryWorkspaceForUser } from "@/lib/tenancy";
import { prisma } from "@postpilot/db";

export default async function CalendarPage() {
  const session = await requireSession();
  const workspace = await getPrimaryWorkspaceForUser(session.user.id);
  const posts = await prisma.plannedPost.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    orderBy: { targetPublishAt: "asc" },
    take: 40,
    include: {
      drafts: { where: { isActive: true }, take: 1 },
    },
  });
  const jobs = await prisma.scheduledJob.findMany({
    where: { workspaceId: workspace.id, kind: "PUBLISH_POST" },
    orderBy: { runAt: "asc" },
    take: 20,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Content calendar</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Planned and scheduled posts for this workspace.
        </p>
      </div>
      <div className="space-y-3">
        {posts.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          >
            <div>
              <p className="font-medium">{p.topic}</p>
              <p className="text-xs text-[var(--muted)]">
                {p.format} · {p.platforms.join(", ")} · {p.status}
              </p>
            </div>
            <p className="text-sm text-[var(--muted)]">
              {p.targetPublishAt
                ? new Date(p.targetPublishAt).toLocaleString()
                : "—"}
            </p>
          </div>
        ))}
        {!posts.length ? (
          <p className="text-sm text-[var(--muted)]">No planned posts yet.</p>
        ) : null}
      </div>
      <section>
        <h2 className="font-medium">Publish queue</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {jobs.map((j) => (
            <li
              key={j.id}
              className="rounded-xl border border-[var(--border)] px-3 py-2"
            >
              {j.status} · {new Date(j.runAt).toLocaleString()}
            </li>
          ))}
          {!jobs.length ? (
            <li className="text-[var(--muted)]">No scheduled publish jobs.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
