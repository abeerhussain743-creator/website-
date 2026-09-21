import { EmptyState } from "@maxtrone/ui";

export default function BroadcastsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Broadcasts</h1>
      <EmptyState
        title="Audience builder"
        description="Compose once, send per guardian language, with cost metering before send."
      />
    </div>
  );
}
