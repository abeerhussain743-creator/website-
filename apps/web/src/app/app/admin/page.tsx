import { requireSession } from "@/lib/access";
import { getPrimaryWorkspaceForUser } from "@/lib/tenancy";
import { prisma } from "@postpilot/db";

export default async function AdminPage() {
  const session = await requireSession();
  const workspace = await getPrimaryWorkspaceForUser(session.user.id);
  const [runs, failedJobs, aiCosts, users] = await Promise.all([
    prisma.pipelineRun.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.scheduledJob.findMany({
      where: { workspaceId: workspace.id, status: { in: ["FAILED", "DEAD_LETTER"] } },
      take: 10,
    }),
    prisma.aICallLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.membership.count({
      where: { organizationId: workspace.organizationId, deletedAt: null },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Admin</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Jobs, AI cost log, and workspace health. Full org admin expands with Stripe
          in production billing.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card label="Team members" value={String(users)} />
        <Card label="Pipeline runs" value={String(runs.length)} />
        <Card label="AI calls logged" value={String(aiCosts.length)} />
      </div>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-medium">Recent pipeline runs</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {runs.map((r) => (
            <li key={r.id} className="flex justify-between gap-3 border-b border-[var(--border)] py-2">
              <span>{r.status} · {r.currentStep ?? "—"}</span>
              <span className="text-[var(--muted)]">
                {new Date(r.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-medium">Failed jobs</h2>
        {!failedJobs.length ? (
          <p className="mt-2 text-sm text-[var(--muted)]">No failed jobs.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {failedJobs.map((j) => (
              <li key={j.id}>
                {j.kind} · {j.lastError}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-medium">AI call log</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {aiCosts.map((c) => (
            <li key={c.id} className="flex justify-between gap-3">
              <span>
                {c.kind} · {c.model}
              </span>
              <span className="text-[var(--muted)]">
                {new Date(c.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
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
