import { Button } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";
import { submitAttendance } from "@/actions/campus";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string; subgroupId?: string }>;
}) {
  const sp = await searchParams;
  const { db, institution } = await requireTenantContext();
  const groups = await db.group.findMany({
    orderBy: { sortOrder: "asc" },
    include: { subgroups: true },
  });
  const groupId = sp.groupId ?? groups[0]?.id;
  const subgroupId = sp.subgroupId ?? undefined;

  const enrollments = groupId
    ? await db.enrollment.findMany({
        where: {
          groupId,
          ...(subgroupId ? { subgroupId } : {}),
          deletedAt: null,
        },
        include: { student: true },
      })
    : [];

  async function mark(formData: FormData) {
    "use server";
    const absences = formData.getAll("absent").map(String);
    const g = String(formData.get("groupId"));
    const sg = String(formData.get("subgroupId") || "") || null;
    const date = String(formData.get("date"));
    await submitAttendance({ groupId: g, subgroupId: sg, date, absences });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Attendance</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          All present by default — tap to mark absent, submit in under 20 seconds.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <a
            key={g.id}
            href={`/attendance?groupId=${g.id}`}
            className={`rounded-[12px] px-3 py-2 text-sm ${
              g.id === groupId
                ? "bg-[var(--ink)] text-[var(--ivory)]"
                : "border border-[var(--border)] bg-[var(--card)]"
            }`}
          >
            {g.name}
          </a>
        ))}
      </div>

      {groupId ? (
        <form action={mark} className="space-y-4">
          <input type="hidden" name="groupId" value={groupId} />
          {subgroupId ? <input type="hidden" name="subgroupId" value={subgroupId} /> : null}
          <input
            type="date"
            name="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="h-10 rounded-[12px] border border-[var(--border)] px-3 text-sm"
          />
          <ul className="grid gap-2 sm:grid-cols-2">
            {enrollments.map((e) => (
              <li key={e.id}>
                <label className="flex cursor-pointer items-center justify-between rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm">
                  <span>{e.student.fullName}</span>
                  <span className="flex items-center gap-2 text-xs text-[var(--danger)]">
                    Absent
                    <input type="checkbox" name="absent" value={e.studentId} className="h-4 w-4" />
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {enrollments.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No {institution.terminology?.learner?.toLowerCase() ?? "student"}s enrolled in this{" "}
              {institution.terminology?.group?.toLowerCase() ?? "class"}.
            </p>
          ) : (
            <Button type="submit">Submit attendance</Button>
          )}
        </form>
      ) : null}
    </div>
  );
}
