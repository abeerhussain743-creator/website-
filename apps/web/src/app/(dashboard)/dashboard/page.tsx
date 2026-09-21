import Link from "next/link";
import { formatPkr } from "@maxtrone/core";
import { Button, EmptyState, Kpi } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";

export default async function DashboardPage() {
  const { db, institution, membership } = await requireTenantContext();

  const [studentCount, guardianCount, taskCount] = await Promise.all([
    db.student.count({ where: { status: "ACTIVE", deletedAt: null } }),
    db.guardian.count({ where: { deletedAt: null } }),
    db.task.count({ where: { status: "OPEN", deletedAt: null } }),
  ]);

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Collected this month"
          value={formatPkr(0)}
          hint="Phase 1 fee engine"
        />
        <Kpi
          label="Outstanding"
          value={formatPkr(0)}
          hint="Recovery ladder coming in Phase 1"
        />
        <Kpi
          label={`Active ${terms?.learner ?? "Student"}s`}
          value={String(studentCount)}
        />
        <Kpi label="Open tasks" value={String(taskCount)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <EmptyState
          title="Admissions funnel"
          description="Wire Phase 1 CRM to see inquiries → visits → admitted with rupee impact."
          action={
            <Button asChild variant="outline">
              <Link href="/admissions">Open admissions</Link>
            </Button>
          }
        />
        <EmptyState
          title={`${terms?.guardian ?? "Parent"} reach`}
          description={`${guardianCount} guardians on file. WhatsApp inbox and 8am briefing ship in Phase 1.`}
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
