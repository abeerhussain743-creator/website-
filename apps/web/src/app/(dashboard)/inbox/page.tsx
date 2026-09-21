import { EmptyState } from "@maxtrone/ui";

export default function InboxPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">WhatsApp inbox</h1>
      <EmptyState
        title="Shared inbox"
        description="Conversations, 24-hour window enforcement, and guardian context arrive in Phase 1."
      />
    </div>
  );
}
