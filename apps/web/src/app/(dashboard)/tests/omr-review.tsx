"use client";

import { useState, useTransition } from "react";
import { Button } from "@maxtrone/ui";
import { reviewOmrScanWithAnswers } from "@/actions/phase23";

type Bubble = { questionNumber: number; option: string; confidence: number };

export function OmrReviewCard({
  scanId,
  imageUrl,
  confidence,
  score,
  answers,
}: {
  scanId: string;
  imageUrl: string;
  confidence: number;
  score: number | null;
  answers: Bubble[];
}) {
  const [rows, setRows] = useState(answers);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p>
            Confidence {Math.round(confidence * 100)}% · detected score {score ?? "—"}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">{imageUrl}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await reviewOmrScanWithAnswers(scanId, true, rows);
              })
            }
          >
            Accept
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await reviewOmrScanWithAnswers(scanId, false, rows);
              })
            }
          >
            Reject
          </Button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {rows.map((a, i) => (
          <label key={a.questionNumber} className="text-xs">
            Q{a.questionNumber}
            <select
              value={a.option}
              onChange={(e) => {
                const option = e.target.value;
                setRows((prev) =>
                  prev.map((r, idx) => (idx === i ? { ...r, option } : r)),
                );
              }}
              className="mt-1 w-full rounded-[8px] border border-[var(--border)] bg-[var(--background)] px-2 py-1"
            >
              {["A", "B", "C", "D"].map((o) => (
                <option key={o} value={o}>
                  {o} {a.confidence < 0.85 && a.option === o ? "⚠" : ""}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
