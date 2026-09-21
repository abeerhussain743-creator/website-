import { EmptyState } from "@maxtrone/ui";

export default function FeesRecordPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Record payment</h1>
      <EmptyState
        title="Cash / cheque entry"
        description="Staff payment entry and reconciliation arrive with the fees module."
      />
    </div>
  );
}
