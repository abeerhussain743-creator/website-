import { Button, EmptyState } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";
import { approveProgressNotes } from "@/actions/phase23";

export default async function ProgressPage() {
  const { db } = await requireTenantContext();
  const notes = await db.progressNote.findMany({
    orderBy: { weekOf: "desc" },
    include: { student: true },
    take: 40,
  });

  async function generateDrafts() {
    "use server";
    const { getQueues } = await import("@/lib/queues");
    const { requireTenantContext } = await import("@/lib/tenant");
    const { institution } = await requireTenantContext();
    await getQueues().academics.add(
      "weekly-progress",
      { institutionId: institution.id },
      { jobId: `progress:${institution.id}:${Date.now()}` },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Progress notes</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Weekly AI updates — review, approve, then WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          <form action={generateDrafts}>
            <Button type="submit" variant="outline">
              Generate drafts
            </Button>
          </form>
          <form action={approveProgressNotes}>
            <Button type="submit">Approve & send</Button>
          </form>
        </div>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          title="No progress notes"
          description="Generate Friday drafts from attendance and marks."
        />
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <p className="font-medium">{n.student.fullName}</p>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {n.status}
                </span>
              </div>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-[var(--body)]">
                {n.body}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
