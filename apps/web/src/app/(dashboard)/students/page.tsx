import Link from "next/link";
import { Button, EmptyState } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";

export default async function StudentsPage() {
  const { db, institution } = await requireTenantContext();
  const learner = institution.terminology?.learner ?? "Student";
  const students = await db.student.findMany({
    where: { deletedAt: null },
    orderBy: { fullName: "asc" },
    take: 50,
  });

  if (students.length === 0) {
    return (
      <EmptyState
        title={`No ${learner.toLowerCase()}s yet`}
        description="Import from Excel/CSV or add the first record. Phase 1 ships the import engine."
        action={
          <Button asChild>
            <Link href="/settings">Go to settings</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">{learner}s</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Tenant-scoped list · showing {students.length}
        </p>
      </div>
      <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--muted)]/50 text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Reg. no</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 font-medium">{s.fullName}</td>
                <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]">
                  {s.registrationNo ?? "—"}
                </td>
                <td className="px-4 py-3">{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
