import { EmptyState } from "@maxtrone/ui";

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Attendance</h1>
      <EmptyState
        title="Mark a class in under 20 seconds"
        description="Mobile-first attendance with absent alerts ships in Phase 1."
      />
    </div>
  );
}
