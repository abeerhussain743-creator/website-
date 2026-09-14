"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StoreOption = { id: string; label: string };

export function BulkUpdateForm({ stores }: { stores: StoreOption[] }) {
  const router = useRouter();
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [percent, setPercent] = useState("10");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bulk-update/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          operation: {
            field: "price",
            mode: "percent",
            value: percent,
          },
        }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) throw new Error(data.error ?? "Failed");
      router.push(`/app/jobs/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-ink-100 bg-white/80 p-5 shadow-soft">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      <label className="block text-sm font-medium">
        Store
        <select
          className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Increase all product prices by (%)
        <input
          type="number"
          className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2"
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
        />
      </label>
      <div className="rounded-xl bg-sand-50 px-4 py-3 text-sm text-ink-500">
        Preview example: $100 → $
        {(100 * (1 + Number(percent || 0) / 100)).toFixed(2)}
      </div>
      <button
        type="button"
        disabled={!storeId || busy}
        onClick={() => void start()}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Queuing…" : "Queue bulk update"}
      </button>
    </div>
  );
}
