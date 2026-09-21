import { EmptyState } from "@maxtrone/ui";

export default function FeesPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Fees</h1>
      <EmptyState
        title="Fee recovery — Phase 1"
        description="Structures, invoices, JazzCash/Easypaisa, and the escalation ladder. Money logic already lives in @maxtrone/core/fees."
      />
    </div>
  );
}
