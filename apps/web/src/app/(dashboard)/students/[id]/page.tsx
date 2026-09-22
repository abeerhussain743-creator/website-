import { formatPkr } from "@maxtrone/core";
import { requireTenantContext } from "@/lib/tenant";
import { notFound } from "next/navigation";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { db, institution } = await requireTenantContext();
  const student = await db.student.findFirst({
    where: { id },
    include: {
      guardians: { include: { guardian: true } },
      enrollments: { include: { group: true, subgroup: true } },
      attendanceRecords: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { session: true },
      },
      invoices: { orderBy: { dueDate: "desc" }, take: 10 },
    },
  });
  if (!student) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">{student.fullName}</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {student.registrationNo ?? "No reg. no"} · {student.status}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-5 text-sm">
          <h2 className="font-display text-lg font-semibold">
            {institution.terminology?.guardian ?? "Guardian"}
          </h2>
          <ul className="mt-3 space-y-2">
            {student.guardians.map((g) => (
              <li key={g.id}>
                {g.guardian.fullName} · {g.guardian.phone} · {g.guardian.preferredLanguage}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-5 text-sm">
          <h2 className="font-display text-lg font-semibold">Enrollment</h2>
          <ul className="mt-3 space-y-2">
            {student.enrollments.map((e) => (
              <li key={e.id}>
                {e.group.name}
                {e.subgroup ? `-${e.subgroup.name}` : ""}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="font-display text-lg font-semibold">Timeline</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {student.attendanceRecords.map((r) => (
            <li key={r.id} className="flex justify-between border-b border-[var(--border)] pb-2">
              <span>Attendance {r.status}</span>
              <span className="tabular-nums text-[var(--muted-foreground)]">
                {new Date(r.session.date).toISOString().slice(0, 10)}
              </span>
            </li>
          ))}
          {student.invoices.map((inv) => (
            <li key={inv.id} className="flex justify-between border-b border-[var(--border)] pb-2">
              <span>
                Invoice {inv.number} · {formatPkr(inv.totalPaisa - inv.paidPaisa)} due
              </span>
              <span className="text-[var(--muted-foreground)]">{inv.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
