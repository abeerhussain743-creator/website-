import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@shopdata/db";
import { JobActions } from "@/components/job-actions";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await prisma.job
    .findUnique({
      where: { id },
      include: {
        store: true,
        errors: { take: 100, orderBy: { rowNumber: "asc" } },
      },
    })
    .catch(() => null);

  if (!job) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/app/jobs" className="text-sm font-medium text-accent">
          ← All jobs
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold">
          {job.type.replaceAll("_", " ")}
        </h1>
        <p className="mt-1 text-ink-500">
          {job.store.name ?? job.store.shopDomain} · {job.status}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Progress", `${job.progressPercent}%`],
          ["Processed", `${job.processedRecords}/${job.totalRecords}`],
          ["Successful", job.successfulRecords],
          ["Failed", job.failedRecords],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-ink-100 bg-white/80 p-4"
          >
            <div className="text-xs text-ink-500">{label}</div>
            <div className="mt-1 text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${job.progressPercent}%` }}
        />
      </div>

      <JobActions
        jobId={job.id}
        status={job.status}
        failedRecords={job.failedRecords}
      />

      {job.errors.length > 0 && (
        <section className="rounded-2xl border border-ink-100 bg-white/80 p-5">
          <h2 className="text-lg font-semibold">Errors</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {job.errors.map((err) => (
              <li
                key={err.id}
                className="rounded-lg border border-red-100 bg-red-50 px-3 py-2"
              >
                <strong>Row {err.rowNumber ?? "—"}</strong>
                {err.field ? ` · ${err.field}` : ""}: {err.message}
                {err.suggestedFix ? (
                  <div className="text-ink-500">Suggested: {err.suggestedFix}</div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
