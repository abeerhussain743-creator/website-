import Link from "next/link";
import { formatPkr, hasFeature, resolveEntitlements } from "@maxtrone/core";
import { Button, EmptyState, Kpi } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";

export default async function DashboardPage() {
  const { db, institution, membership } = await requireTenantContext();
  const entitlements = resolveEntitlements(
    institution.plan.entitlements,
    institution.entitlementOverrides,
  );

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [
    studentCount,
    guardianCount,
    taskCount,
    leadCount,
    invoices,
    payments,
    setupComplete,
  ] = await Promise.all([
    db.student.count({ where: { status: "ACTIVE", deletedAt: null } }),
    db.guardian.count({ where: { deletedAt: null } }),
    db.task.count({ where: { status: "OPEN", deletedAt: null } }),
    db.lead.count({ where: { status: "OPEN", deletedAt: null } }),
    db.invoice.findMany({
      where: { deletedAt: null, status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } },
      take: 500,
    }),
    db.payment.findMany({
      where: { status: "SUCCEEDED", receivedAt: { gte: monthStart } },
      take: 500,
    }),
    Promise.resolve(institution.onboardingStep === "complete"),
  ]);

  const collected = payments.reduce((s, p) => s + p.amountPaisa, 0);
  const outstanding = invoices.reduce((s, i) => s + (i.totalPaisa - i.paidPaisa), 0);
  const recoveryRuns = await db.recoveryRun.count({
    where: { sentAt: { gte: monthStart } },
  });

  const stages = await db.leadStage.findMany({ orderBy: { sortOrder: "asc" } });
  const leadsByStage = await Promise.all(
    stages.map(async (s) => ({
      name: s.name,
      count: await db.lead.count({ where: { stageId: s.id, deletedAt: null } }),
    })),
  );

  const terms = institution.terminology;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {membership.role.name} · {institution.city ?? "Pakistan"}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            {institution.name}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted-foreground)]">
            Money and outcomes first — admissions, fees, retention, and new income.
          </p>
        </div>
        <Button asChild variant="accent">
          <Link href="/admissions/new">New inquiry</Link>
        </Button>
      </div>

      {!setupComplete ? (
        <div className="rounded-[16px] border border-[var(--gold)]/40 bg-[var(--card)] p-5">
          <p className="font-medium">Finish setup</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Complete the onboarding checklist to go live.
          </p>
          <Button asChild className="mt-3" size="sm">
            <Link href={`/onboarding?step=${institution.onboardingStep ?? "groups"}`}>
              Resume wizard
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/fees">
          <Kpi label="Collected this month" value={formatPkr(collected)} hint="Click for fees" />
        </Link>
        <Link href="/fees">
          <Kpi label="Outstanding" value={formatPkr(outstanding)} hint={`${recoveryRuns} recovery touches`} />
        </Link>
        <Link href="/admissions">
          <Kpi label="Open inquiries" value={String(leadCount)} />
        </Link>
        <Link href="/students">
          <Kpi
            label={`Active ${terms?.learner ?? "Student"}s`}
            value={String(studentCount)}
          />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="font-display text-lg font-semibold">Admissions funnel</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {leadsByStage.map((s) => (
              <li key={s.name} className="flex justify-between">
                <span>{s.name}</span>
                <span className="tabular-nums font-medium">{s.count}</span>
              </li>
            ))}
          </ul>
          {!hasFeature(entitlements, "ai_admissions") ? (
            <p className="mt-3 text-xs text-[var(--gold-dark)]">AI admissions locked on your plan</p>
          ) : null}
        </div>
        <EmptyState
          title={`${terms?.guardian ?? "Parent"} reach`}
          description={`${guardianCount} guardians · ${taskCount} open tasks. Inbox and 8am briefing are live.`}
          action={
            <Button asChild variant="outline">
              <Link href="/inbox">Open inbox</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
