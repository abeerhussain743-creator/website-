import { requireSession } from "@/lib/access";
import { getPrimaryWorkspaceForUser } from "@/lib/tenancy";
import { prisma } from "@postpilot/db";

export default async function StagePage() {
  const session = await requireSession();
  const workspace = await getPrimaryWorkspaceForUser(session.user.id);
  const report = await prisma.stageReport.findFirst({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });
  const mix = (report?.contentMixJson ?? {}) as Record<string, number>;
  const bottlenecks = (report?.bottlenecksJson ?? []) as string[];
  const signals = (report?.signalsJson ?? {}) as Record<string, number>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Account stage</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Niche-relative diagnosis that drives next week&apos;s content mix.
        </p>
      </div>

      {!report ? (
        <p className="text-sm text-[var(--muted)]">
          Run the weekly pipeline to generate a stage report.
        </p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card label="Stage" value={report.stage} />
            <Card label="Score" value={String(Math.round(report.score))} />
            <Card
              label="Followers"
              value={String(signals.followers ?? "—")}
            />
          </div>
          <p className="max-w-3xl text-sm text-[var(--muted)]">{report.summary}</p>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="font-medium">Recommended content mix</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {Object.entries(mix).map(([k, v]) => (
                <div key={k} className="rounded-xl border border-[var(--border)] p-3">
                  <p className="text-xs uppercase text-[var(--muted)]">{k}</p>
                  <p className="text-2xl font-medium">{v}%</p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="font-medium">Bottlenecks</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
              {bottlenecks.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </section>
        </>
      )}
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
