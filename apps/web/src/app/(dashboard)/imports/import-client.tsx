"use client";

import * as React from "react";
import { Button } from "@maxtrone/ui";

export function ImportClient() {
  const [file, setFile] = React.useState<File | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<null | {
    status: string;
    successRows: number;
    errorRows: number;
    totalRows: number;
  }>(null);

  async function upload() {
    if (!file) return;
    setStatus("Uploading…");
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/imports", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Failed");
      return;
    }
    setJobId(data.jobId);
    setStatus(`Queued ${data.totalRows} rows · mapping detected`);
    poll(data.jobId);
  }

  async function poll(id: string) {
    const tick = async () => {
      const res = await fetch(`/api/imports?jobId=${id}`);
      const data = await res.json();
      const job = data.job;
      if (!job) return;
      setProgress({
        status: job.status,
        successRows: job.successRows,
        errorRows: job.errorRows,
        totalRows: job.totalRows,
      });
      if (job.status === "IMPORTING" || job.status === "PENDING") {
        setTimeout(tick, 1000);
      } else {
        setStatus(`Done: ${job.successRows} ok, ${job.errorRows} errors`);
      }
    };
    tick();
  }

  return (
    <div className="space-y-4 rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-5">
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <Button type="button" onClick={upload} disabled={!file}>
        Start import
      </Button>
      {status ? <p className="text-sm">{status}</p> : null}
      {progress ? (
        <div className="text-sm text-[var(--muted-foreground)]">
          <p>Status: {progress.status}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className="h-full bg-[var(--gold)] transition-all"
              style={{
                width: `${progress.totalRows ? ((progress.successRows + progress.errorRows) / progress.totalRows) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      ) : null}
      {jobId ? <p className="text-xs text-[var(--muted-foreground)]">Job {jobId}</p> : null}
    </div>
  );
}
