import { requireSession } from "@/lib/access";
import { getPrimaryWorkspaceForUser } from "@/lib/tenancy";
import { prisma } from "@postpilot/db";
import { PipelineControls } from "@/components/pipeline/controls";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await requireSession();
  const workspace = await getPrimaryWorkspaceForUser(session.user.id);
  const [brand, plan, stage, run] = await Promise.all([
    prisma.brandProfile.findUnique({ where: { workspaceId: workspace.id } }),
    prisma.contentPlan.findFirst({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      include: { posts: true },
    }),
    prisma.stageReport.findFirst({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pipelineRun.findFirst({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-[var(--muted)]">Command center</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">
          {brand?.businessName ?? workspace.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Full PostPilot loop: research → stage → weekly plan → design → approve →
          publish → learn.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Stage" value={stage?.stage ?? "—"} />
        <Stat label="Plan status" value={plan?.status ?? "None"} />
        <Stat label="Posts this week" value={String(plan?.posts.length ?? 0)} />
        <Stat label="Last pipeline" value={run?.status ?? "—"} />
      </div>

      <PipelineControls workspaceId={workspace.id} />

      <section className="flex flex-wrap gap-3">
        <Link href="/app/review">
          <Button>Review board</Button>
        </Link>
        <Link href="/app/studio">
          <Button variant="secondary">Design Studio</Button>
        </Link>
        <Link href="/app/competitors">
          <Button variant="ghost">Competitors</Button>
        </Link>
        <Link href="/app/analytics">
          <Button variant="ghost">Analytics</Button>
        </Link>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-lg font-medium">{value}</p>
    </div>
  );
}
