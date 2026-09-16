"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function JobActions({
  jobId,
  status,
  failedRecords,
}: {
  jobId: string;
  status: string;
  failedRecords: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function cancel() {
    setBusy(true);
    await fetch(`/api/jobs/${jobId}/cancel`, { method: "POST" });
    router.refresh();
    setBusy(false);
  }

  async function retryFailed() {
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/retry-failed`, {
        method: "POST",
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (res.ok && data.jobId) {
        router.push(`/app/jobs/${data.jobId}`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const canCancel = ["QUEUED", "VALIDATING", "PROCESSING"].includes(status);

  return (
    <div className="flex flex-wrap gap-2">
      {canCancel && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void cancel()}
          className="rounded-lg border border-ink-300 bg-white px-4 py-2 text-sm font-semibold"
        >
          Cancel job
        </button>
      )}
      {failedRecords > 0 && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void retryFailed()}
          className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Retry failed records
        </button>
      )}
      <button
        type="button"
        onClick={() => router.refresh()}
        className="rounded-lg border border-ink-300 bg-white px-4 py-2 text-sm font-semibold"
      >
        Refresh
      </button>
    </div>
  );
}
