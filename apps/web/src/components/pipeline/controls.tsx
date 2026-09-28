"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export function PipelineControls({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [promo, setPromo] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    start(async () => {
      setError(null);
      setStatus("Running weekly AI pipeline… this can take ~30–90s");
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          promo: promo || undefined,
          sync: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Pipeline failed");
        setStatus(null);
        return;
      }
      setStatus(`Pipeline ${json.run?.status ?? "done"}`);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-soft">
      <h2 className="font-display text-2xl">Weekly automation</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Research competitors → diagnose stage → plan 7 days → generate + design →
        send for approval.
      </p>
      <div className="mt-4">
        <Label htmlFor="promo">This week&apos;s promo (optional)</Label>
        <Input
          id="promo"
          value={promo}
          onChange={(e) => setPromo(e.target.value)}
          placeholder="e.g. Spring tasting flight"
        />
      </div>
      <Button className="mt-4" onClick={run} disabled={pending}>
        {pending ? "Generating week…" : "Generate next week now"}
      </Button>
      {status ? <p className="mt-3 text-sm text-[var(--muted)]">{status}</p> : null}
      {error ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
