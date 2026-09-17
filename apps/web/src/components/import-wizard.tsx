"use client";

import { useEffect, useMemo, useState } from "react";
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

type SavedMapping = {
  id: string;
  name: string;
  mappings: Array<{ sourceColumn: string; targetField: string | null }>;
};

const STEPS = ["Upload", "Map", "Validate", "Preview", "Run"] as const;

const FIELD_OPTIONS = [
  "",
  "product.handle",
  "product.title",
  "product.bodyHtml",
  "product.vendor",
  "product.productType",
  "product.tags",
  "product.status",
  "variant.sku",
  "variant.price",
  "variant.compareAtPrice",
  "variant.barcode",
  "variant.inventoryQuantity",
  "variant.weight",
  "product.seoTitle",
  "product.seoDescription",
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

function applySavedMapping(
  columns: string[],
  saved: Array<{ sourceColumn: string; targetField: string | null }>,
): Array<{ sourceColumn: string; targetField: string | null }> {
  const bySource = new Map(
    saved.map((m) => [m.sourceColumn.toLowerCase(), m.targetField]),
  );
  return columns.map((sourceColumn) => ({
    sourceColumn,
    targetField: bySource.get(sourceColumn.toLowerCase()) ?? null,
  }));
}

export function ImportWizard({ stores }: { stores: StoreOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [fileName, setFileName] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [mappings, setMappings] = useState<
    Array<{ sourceColumn: string; targetField: string | null }>
  >([]);
  const [savedList, setSavedList] = useState<SavedMapping[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState("");
  const [mappingName, setMappingName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const errorCount = useMemo(
    () => analysis?.issues.filter((i) => i.severity === "error").length ?? 0,
    [analysis],
  );

  useEffect(() => {
    if (!storeId) {
      setSavedList([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/field-mappings?storeId=${encodeURIComponent(storeId)}&dataset=PRODUCTS`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { mappings?: SavedMapping[] };
        if (!cancelled) setSavedList(data.mappings ?? []);
      } catch {
        /* ignore — templates are optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    setSaveMessage(null);
    try {
      const isExcel = /\.xlsx?$/i.test(file.name);
      const body = isExcel
        ? {
            fileBase64: await fileToBase64(file),
            filename: file.name,
          }
        : {
            csvContent: await file.text(),
            filename: file.name,
          };

      const res = await fetch("/api/imports/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as AnalyzeResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Analyze failed");
      setFileName(file.name);
      setAnalysis(data);
      setMappings(data.mappings);
      setSelectedSavedId("");
      setMappingName("");
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function loadSavedMapping(id: string) {
    setSelectedSavedId(id);
    setSaveMessage(null);
    if (!id || !analysis) return;
    const saved = savedList.find((m) => m.id === id);
    if (!saved) return;
    setMappings(applySavedMapping(analysis.columns, saved.mappings));
    setMappingName(saved.name);
  }

  async function saveMapping() {
    if (!storeId || !mappings.length) return;
    const name = mappingName.trim();
    if (!name) {
      setError("Enter a name before saving the mapping");
      return;
    }
    setBusy(true);
    setError(null);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/field-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          name,
          dataset: analysis?.dataset ?? "PRODUCTS",
          mappings,
          columns: analysis?.columns,
        }),
      });
      const data = (await res.json()) as {
        id?: string;
        name?: string;
        error?: string;
      };
      if (!res.ok || !data.id) throw new Error(data.error ?? "Save failed");
      setSaveMessage(`Saved “${data.name}”`);
      setSavedList((prev) => [
        {
          id: data.id!,
          name: data.name ?? name,
          mappings,
        },
        ...prev.filter((m) => m.id !== data.id),
      ]);
      setSelectedSavedId(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save mapping");
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
          filename: fileName.replace(/\.xlsx?$/i, ".csv"),
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
            <span className="font-medium">
              Drop a CSV or Excel file, or click to browse
            </span>
            <span className="mt-1 text-sm text-ink-500">
              Supports .csv and .xlsx product sheets
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
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

              {savedList.length > 0 && (
                <label className="block text-sm font-medium">
                  Load saved mapping
                  <select
                    className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2"
                    value={selectedSavedId}
                    onChange={(e) => loadSavedMapping(e.target.value)}
                  >
                    <option value="">Auto-detected mapping</option>
                    {savedList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-ink-500">
                      <th className="py-2 pr-4">Spreadsheet column</th>
                      <th className="py-2">Shopify field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m, idx) => (
                      <tr key={m.sourceColumn} className="border-b border-ink-100">
                        <td className="py-2 pr-4 font-medium">{m.sourceColumn}</td>
                        <td className="py-2">
                          <select
                            className="w-full rounded border border-ink-300 px-2 py-1"
                            value={m.targetField ?? ""}
                            onChange={(e) => {
                              const next = [...mappings];
                              next[idx] = {
                                ...m,
                                targetField: e.target.value || null,
                              };
                              setMappings(next);
                            }}
                          >
                            {FIELD_OPTIONS.map((opt) => (
                              <option key={opt || "none"} value={opt}>
                                {opt || "unmapped"}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-end gap-2 rounded-xl bg-sand-50 p-3">
                <label className="min-w-[12rem] flex-1 text-sm font-medium">
                  Save mapping as
                  <input
                    className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2"
                    placeholder="e.g. Supplier catalog v2"
                    value={mappingName}
                    onChange={(e) => setMappingName(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-lg border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-800 disabled:opacity-50"
                  onClick={() => void saveMapping()}
                >
                  Save mapping
                </button>
              </div>
              {saveMessage && (
                <p className="text-sm text-accent">{saveMessage}</p>
              )}

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
              <p className="text-sm text-ink-500">
                Duplicate handles in the file are counted as updates. Shopify
                creates vs updates are finalized during the job.
              </p>
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
