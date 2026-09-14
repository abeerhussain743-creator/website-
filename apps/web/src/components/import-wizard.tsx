"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type StoreOption = { id: string; label: string };

type AnalyzeResponse = {
  columns: string[];
  dataset: string;
  rowCount: number;
  mappings: Array<{ sourceColumn: string; targetField: string | null }>;
  issues: Array<{
    row: number;
    field?: string;
    value?: string;
    message: string;
    suggestedFix?: string;
    severity: string;
  }>;
  preview: {
    totalRows: number;
    creates: number;
    updates: number;
    unchanged: number;
    errors: number;
    warnings: number;
  };
  csvContent: string;
};

const STEPS = ["Upload", "Map", "Validate", "Preview", "Run"] as const;

export function ImportWizard({ stores }: { stores: StoreOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [fileName, setFileName] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [mappings, setMappings] = useState<
    Array<{ sourceColumn: string; targetField: string | null }>
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorCount = useMemo(
    () => analysis?.issues.filter((i) => i.severity === "error").length ?? 0,
    [analysis],
  );

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/imports/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: text, filename: file.name }),
      });
      const data = (await res.json()) as AnalyzeResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Analyze failed");
      setFileName(file.name);
      setAnalysis(data);
      setMappings(data.mappings);
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function startImport() {
    if (!analysis || !storeId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/imports/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          csvContent: analysis.csvContent,
          mappings,
          filename: fileName,
        }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) throw new Error(data.error ?? "Start failed");
      router.push(`/app/jobs/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start import");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-ink-100 bg-white/80 p-5 shadow-soft">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              index === step
                ? "bg-ink-900 text-white"
                : index < step
                  ? "bg-accent-muted text-accent"
                  : "bg-ink-100 text-ink-500"
            }`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {step === 0 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Store
            <select
              className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
            >
              {stores.length === 0 && (
                <option value="">Connect a store first</option>
              )}
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-ink-300 bg-sand-50 px-4 py-12 text-center">
            <span className="font-medium">Drop a CSV file or click to browse</span>
            <span className="mt-1 text-sm text-ink-500">
              MVP supports CSV product imports (XLSX streaming next)
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={busy || !storeId}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
              }}
            />
          </label>
        </div>
      )}

      {step >= 1 && analysis && (
        <>
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-ink-500">
                Detected <strong>{analysis.dataset}</strong> ·{" "}
                {analysis.rowCount} rows · {fileName}
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-ink-500">
                      <th className="py-2 pr-4">CSV column</th>
                      <th className="py-2">Shopify field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m, idx) => (
                      <tr key={m.sourceColumn} className="border-b border-ink-100">
                        <td className="py-2 pr-4 font-medium">{m.sourceColumn}</td>
                        <td className="py-2">
                          <input
                            className="w-full rounded border border-ink-300 px-2 py-1"
                            value={m.targetField ?? ""}
                            placeholder="unmapped"
                            onChange={(e) => {
                              const next = [...mappings];
                              next[idx] = {
                                ...m,
                                targetField: e.target.value || null,
                              };
                              setMappings(next);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => setStep(2)}
              >
                Continue to validation
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm">
                {errorCount === 0
                  ? "No blocking validation errors."
                  : `${errorCount} validation issue(s) found.`}
              </p>
              <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                {analysis.issues.slice(0, 50).map((issue, i) => (
                  <li
                    key={`${issue.row}-${i}`}
                    className="rounded-lg border border-ink-100 bg-sand-50 px-3 py-2"
                  >
                    <span className="font-semibold">
                      Row {issue.row || "—"} · {issue.field}
                    </span>
                    <div>{issue.message}</div>
                    {issue.suggestedFix && (
                      <div className="text-ink-500">Fix: {issue.suggestedFix}</div>
                    )}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => setStep(3)}
              >
                Continue to preview
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {(
                  [
                    ["Rows", analysis.preview.totalRows],
                    ["Creates", analysis.preview.creates],
                    ["Updates", analysis.preview.updates],
                    ["Errors", analysis.preview.errors],
                    ["Warnings", analysis.preview.warnings],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-sand-50 px-3 py-3 text-center"
                  >
                    <div className="text-xl font-bold">{value}</div>
                    <div className="text-xs text-ink-500">{label}</div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
                onClick={() => setStep(4)}
              >
                Confirm preview
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-ink-500">
                Start a background import job. You can monitor progress and
                retry failed rows from the job detail page.
              </p>
              <button
                type="button"
                disabled={busy || !storeId}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void startImport()}
              >
                {busy ? "Starting…" : "Start import job"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
