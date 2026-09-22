import Link from "next/link";
import { Button } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";
import { moveLeadStage } from "@/actions/campus";

export default async function AdmissionsPage() {
  const { db } = await requireTenantContext();
  const stages = await db.leadStage.findMany({ orderBy: { sortOrder: "asc" } });
  const leads = await db.lead.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Admissions</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Kanban pipeline · AI grounded in knowledge base
          </p>
        </div>
        <Button asChild variant="accent">
          <Link href="/admissions/new">New inquiry</Link>
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => {
          const column = leads.filter((l) => l.stageId === stage.id);
          return (
            <div
              key={stage.id}
              className="w-72 shrink-0 rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{stage.name}</h2>
                <span className="tabular-nums text-xs text-[var(--muted-foreground)]">
                  {column.length}
                </span>
              </div>
              <ul className="space-y-2">
                {column.map((lead) => (
                  <li
                    key={lead.id}
                    className="rounded-[12px] border border-[var(--border)] bg-[var(--background)] p-3 text-sm"
                  >
                    <p className="font-medium">{lead.parentName}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {lead.phone}
                      {lead.childName ? ` · ${lead.childName}` : ""}
                      {lead.classSought ? ` · ${lead.classSought}` : ""}
                      {lead.isSiblingLead ? " · sibling" : ""}
                    </p>
                    <LeadMoveForm
                      leadId={lead.id}
                      stages={stages.map((s) => ({ id: s.id, name: s.name }))}
                      current={lead.stageId}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeadMoveForm({
  leadId,
  stages,
  current,
}: {
  leadId: string;
  stages: Array<{ id: string; name: string }>;
  current: string;
}) {
  async function action(formData: FormData) {
    "use server";
    await moveLeadStage(leadId, String(formData.get("stageId")));
  }
  return (
    <form action={action} className="mt-2 flex gap-1">
      <select
        name="stageId"
        defaultValue={current}
        className="h-8 flex-1 rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-2 text-xs"
      >
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-[8px] bg-[var(--ink)] px-2 text-xs text-[var(--ivory)]"
      >
        Move
      </button>
    </form>
  );
}
