import { EmptyState } from "@maxtrone/ui";

export default function AdmissionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Admissions</h1>
      <EmptyState
        title="Admissions — Phase 1"
        description="Lead capture, Kanban pipeline, AI admissions agent, visit booking, and follow-up sequences."
      />
    </div>
  );
}
