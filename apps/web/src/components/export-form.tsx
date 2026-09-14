"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StoreOption = { id: string; label: string };

export function ExportForm({ stores }: { stores: StoreOption[] }) {
  const router = useRouter();
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [format, setFormat] = useState<"CSV" | "JSON">("CSV");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/exports/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, format, dataset: "PRODUCTS" }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) throw new Error(data.error ?? "Export failed");
      router.push(`/app/jobs/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
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
          {stores.length === 0 && <option value="">No stores</option>}
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Format
        <select
          className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2"
          value={format}
          onChange={(e) => setFormat(e.target.value as "CSV" | "JSON")}
        >
          <option value="CSV">CSV</option>
          <option value="JSON">JSON</option>
        </select>
      </label>
      <p className="text-sm text-ink-500">
        Export runs asynchronously via Shopify Bulk Operations
        (`bulkOperationRunQuery`).
      </p>
      <button
        type="button"
        disabled={!storeId || busy}
        onClick={() => void start()}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Starting…" : "Start product export"}
      </button>
    </div>
  );
}
