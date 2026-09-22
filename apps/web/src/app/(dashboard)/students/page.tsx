import Link from "next/link";
import { Button, EmptyState } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";
import { createStudent } from "@/actions/campus";

export default async function StudentsPage() {
  const { db, institution } = await requireTenantContext();
  const learner = institution.terminology?.learner ?? "Student";
  const [students, groups] = await Promise.all([
    db.student.findMany({
      where: { deletedAt: null },
      orderBy: { fullName: "asc" },
      take: 100,
      include: {
        enrollments: { include: { group: true, subgroup: true } },
        guardians: { include: { guardian: true } },
      },
    }),
    db.group.findMany({
      orderBy: { sortOrder: "asc" },
      include: { subgroups: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">{learner}s</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Tenant-scoped · {students.length} shown ·{" "}
            <Link href="/imports" className="underline">
              Import CSV
            </Link>
          </p>
        </div>
      </div>

      <details className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4">
        <summary className="cursor-pointer font-medium">Add {learner.toLowerCase()}</summary>
        <form action={createStudent} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="fullName" placeholder="Full name" required className="h-10 rounded-[12px] border border-[var(--border)] px-3 text-sm" />
          <input name="registrationNo" placeholder="Reg. no" className="h-10 rounded-[12px] border border-[var(--border)] px-3 text-sm" />
          <select name="groupId" required className="h-10 rounded-[12px] border border-[var(--border)] px-3 text-sm">
            <option value="">Select {institution.terminology?.group ?? "class"}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <select name="subgroupId" className="h-10 rounded-[12px] border border-[var(--border)] px-3 text-sm">
            <option value="">Section (optional)</option>
            {groups.flatMap((g) =>
              g.subgroups.map((s) => (
                <option key={s.id} value={s.id}>{g.name} — {s.name}</option>
              )),
            )}
          </select>
          <input name="guardianName" placeholder="Guardian name" className="h-10 rounded-[12px] border border-[var(--border)] px-3 text-sm" />
          <input name="guardianPhone" placeholder="0300-1234567" required className="h-10 rounded-[12px] border border-[var(--border)] px-3 text-sm" />
          <Button type="submit" className="sm:col-span-2">Save</Button>
        </form>
      </details>

      {students.length === 0 ? (
        <EmptyState
          title={`No ${learner.toLowerCase()}s yet`}
          description="Import from CSV or add the first record."
          action={
            <Button asChild>
              <Link href="/imports">Import CSV</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/50 text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Reg. no</th>
                <th className="px-4 py-3 font-medium">{institution.terminology?.group ?? "Class"}</th>
                <th className="px-4 py-3 font-medium">Guardian</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const enr = s.enrollments[0];
                const g = s.guardians[0]?.guardian;
                return (
                  <tr key={s.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/students/${s.id}`} className="hover:underline">
                        {s.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]">
                      {s.registrationNo ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {enr ? `${enr.group.name}${enr.subgroup ? `-${enr.subgroup.name}` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {g ? `${g.fullName} · ${g.phone}` : "—"}
                    </td>
                    <td className="px-4 py-3">{s.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
