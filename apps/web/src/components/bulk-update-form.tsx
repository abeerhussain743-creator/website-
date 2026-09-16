"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type StoreOption = { id: string; label: string };

const FIELD_OPTIONS = [
  { value: "price", label: "Price" },
  { value: "compareAtPrice", label: "Compare-at price" },
  { value: "inventoryQuantity", label: "Inventory quantity" },
  { value: "status", label: "Status" },
  { value: "tags", label: "Tags" },
] as const;

const MODE_OPTIONS = [
  { value: "percent", label: "Percent change" },
  { value: "set", label: "Set value" },
  { value: "add", label: "Add" },
  { value: "subtract", label: "Subtract" },
] as const;

export function BulkUpdateForm({ stores }: { stores: StoreOption[] }) {
  const router = useRouter();
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [field, setField] =
    useState<(typeof FIELD_OPTIONS)[number]["value"]>("price");
  const [mode, setMode] =
    useState<(typeof MODE_OPTIONS)[number]["value"]>("percent");
  const [value, setValue] = useState("10");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const example = useMemo(() => {
    if (field === "status") {
      return `Status → ${value.toUpperCase() || "ACTIVE"}`;
    }
    if (field === "tags") {
      return `Tags → ${value || "sale, clearance"}`;
    }
    const current = field === "inventoryQuantity" ? 10 : 100;
    const n = Number(value || 0);
    if (Number.isNaN(n)) return "Enter a numeric value";
    let next = current;
    if (mode === "set") next = n;
    if (mode === "percent") next = current * (1 + n / 100);
    if (mode === "add") next = current + n;
    if (mode === "subtract") next = current - n;
    if (field === "inventoryQuantity") {
      return `${current} → ${Math.max(0, Math.round(next))}`;
    }
    return `$${current.toFixed(2)} → $${Math.max(0, next).toFixed(2)}`;
  }, [field, mode, value]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bulk-update/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          operation: { field, mode, value },
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
        Field
        <select
          className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2"
          value={field}
          onChange={(e) =>
            setField(e.target.value as (typeof FIELD_OPTIONS)[number]["value"])
          }
        >
          {FIELD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      {field !== "status" && field !== "tags" && (
        <label className="block text-sm font-medium">
          Mode
          <select
            className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2"
            value={mode}
            onChange={(e) =>
              setMode(e.target.value as (typeof MODE_OPTIONS)[number]["value"])
            }
          >
            {MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block text-sm font-medium">
        Value
        <input
          className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            field === "status"
              ? "ACTIVE | DRAFT | ARCHIVED"
              : field === "tags"
                ? "sale, clearance"
                : "10"
          }
        />
      </label>
      <div className="rounded-xl bg-sand-50 px-4 py-3 text-sm text-ink-500">
        Preview example: {example}
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
