import { ImportClient } from "./import-client";

export default function ImportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Import</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          CSV upload · smart column mapping · background job with progress
        </p>
      </div>
      <ImportClient />
      <p className="text-xs text-[var(--muted-foreground)]">
        Headers like &quot;Student Naam&quot;, &quot;Father Mobile&quot;, &quot;Class&quot; are auto-detected.
        Phones normalize to +92…
      </p>
    </div>
  );
}
