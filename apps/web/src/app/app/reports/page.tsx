import { requireSession } from "@/lib/access";
import { getPrimaryWorkspaceForUser } from "@/lib/tenancy";
import { prisma } from "@postpilot/db";
import { buildWeeklyReport } from "@postpilot/jobs";
import { Button } from "@/components/ui/button";

async function refreshReport(workspaceId: string) {
  "use server";
  await buildWeeklyReport(workspaceId);
}

export default async function ReportsPage() {
  const session = await requireSession();
  const workspace = await getPrimaryWorkspaceForUser(session.user.id);
  let report = await prisma.weeklyReport.findFirst({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });
  if (!report) {
    report = await buildWeeklyReport(workspace.id);
  }
  const summary = report.summaryJson as {
    headline?: string;
    stage?: string;
    whatWorked?: string[];
    whatDidnt?: string[];
    nextWeekChanges?: string[];
    competitorMoves?: string[];
    avgLikes?: number;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Weekly report</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Client-ready summary of what worked and what changes next week.
          </p>
        </div>
        <form action={refreshReport.bind(null, workspace.id)}>
          <Button type="submit" variant="secondary">
            Refresh report
          </Button>
        </form>
      </div>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="font-display text-2xl">
          {summary.headline ?? "Weekly snapshot"}
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Stage {summary.stage} · Avg likes {summary.avgLikes?.toFixed?.(1) ?? "—"}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Block title="What worked" items={summary.whatWorked ?? []} />
          <Block title="What didn't" items={summary.whatDidnt ?? []} />
          <Block title="Next week changes" items={summary.nextWeekChanges ?? []} />
          <Block title="Competitor moves" items={summary.competitorMoves ?? []} />
        </div>
      </section>
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-medium">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
