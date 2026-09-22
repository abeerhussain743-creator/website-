"use client";

import * as React from "react";
import { Button } from "@maxtrone/ui";

export function BroadcastComposer() {
  const [title, setTitle] = React.useState("School announcement");
  const [body, setBody] = React.useState(
    "Assalam o alaikum {{guardian_name}}. Update regarding {{student_name}}.",
  );
  const [result, setResult] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function send() {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, sendNow: true }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setResult(data.error ?? "Failed");
      return;
    }
    setResult(
      `Queued ${data.recipients} messages · estimated cost ${data.estimatedCostLabel}`,
    );
  }

  return (
    <div className="space-y-3 rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-5">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-10 w-full rounded-[12px] border border-[var(--border)] px-3 text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="min-h-32 w-full rounded-[12px] border border-[var(--border)] px-3 py-2 text-sm"
      />
      <p className="text-xs text-[var(--muted-foreground)]">
        Respects opt-outs and quiet hours. Cost is metered before send.
      </p>
      <Button type="button" onClick={send} disabled={loading}>
        {loading ? "Sending…" : "Preview cost & send"}
      </Button>
      {result ? <p className="text-sm text-[var(--success)]">{result}</p> : null}
    </div>
  );
}
