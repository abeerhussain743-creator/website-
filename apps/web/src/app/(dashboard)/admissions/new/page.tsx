import { EmptyState } from "@maxtrone/ui";

export default function AdmissionsNewPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">New lead</h1>
      <EmptyState
        title="Lead form ships in Phase 1"
        description="Walk-in and website form capture will land with the admissions CRM."
      />
    </div>
  );
}
