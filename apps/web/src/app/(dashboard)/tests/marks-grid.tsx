"use client";

import { useState, useTransition } from "react";
import { Button } from "@maxtrone/ui";
import { saveMarks } from "@/actions/phase23";

type StudentRow = { id: string; fullName: string; score: number; weakTopics: string };

export function MarksGrid({
  testId,
  totalMarks,
  initial,
}: {
  testId: string;
  totalMarks: number;
  initial: StudentRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [pending, start] = useTransition();
  const [pasteHint, setPasteHint] = useState("");

  function updateScore(id: string, value: string) {
    const score = Math.min(totalMarks, Math.max(0, Number(value) || 0));
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, score } : r)));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      const next = document.querySelector<HTMLInputElement>(`input[data-mark-row="${index + 1}"]`);
      next?.focus();
      next?.select();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = document.querySelector<HTMLInputElement>(`input[data-mark-row="${index - 1}"]`);
      prev?.focus();
      prev?.select();
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\n") && !text.includes("\t")) return;
    e.preventDefault();
    const lines = text
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    setRows((prev) =>
      prev.map((r, i) => {
        if (i >= lines.length) return r;
        const cells = lines[i]!.split(/[\t,]/);
        const raw = cells.length > 1 ? cells[cells.length - 1]! : cells[0]!;
        const score = Math.min(totalMarks, Math.max(0, Math.round(Number(raw.replace(/[^\d.-]/g, "")) || 0)));
        return { ...r, score };
      }),
    );
    setPasteHint(`Pasted ${Math.min(lines.length, rows.length)} scores from clipboard`);
  }

  function submit() {
    const fd = new FormData();
    fd.set("testId", testId);
    fd.set(
      "marksJson",
      JSON.stringify(
        rows.map((r) => ({
          studentId: r.id,
          score: r.score,
          weakTopics: r.weakTopics
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        })),
      ),
    );
    start(async () => {
      await saveMarks(fd);
    });
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Marks grid</p>
        <p className="text-xs text-[var(--muted-foreground)]">
          ↑↓ / Enter to move · paste Excel column into the box
        </p>
      </div>
      <textarea
        rows={2}
        placeholder="Paste scores from Excel (one per line or TSV)…"
        onPaste={onPaste}
        className="w-full rounded-[12px] border border-dashed border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs"
      />
      {pasteHint ? (
        <p className="text-xs text-[var(--success)]">{pasteHint}</p>
      ) : null}
      <div className="overflow-x-auto rounded-[12px] border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Score / {totalMarks}</th>
              <th className="px-3 py-2">Weak topics</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-1.5">{r.fullName}</td>
                <td className="px-3 py-1.5">
                  <input
                    data-mark-row={i}
                    type="number"
                    min={0}
                    max={totalMarks}
                    value={r.score}
                    onChange={(e) => updateScore(r.id, e.target.value)}
                    onKeyDown={(e) => onKeyDown(e, i)}
                    className="w-20 rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-2 py-1 tabular-nums"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    value={r.weakTopics}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.id === r.id ? { ...x, weakTopics: e.target.value } : x,
                        ),
                      )
                    }
                    placeholder="Algebra, Fractions"
                    className="w-full min-w-[140px] rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-2 py-1"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" onClick={submit} disabled={pending}>
        {pending ? "Saving…" : "Save marks & ranks"}
      </Button>
    </div>
  );
}
