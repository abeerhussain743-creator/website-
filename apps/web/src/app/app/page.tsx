import Link from "next/link";
import { prisma } from "@shopdata/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [storeCount, recentJobs, runningJobs] = await Promise.all([
    prisma.store.count({ where: { isActive: true } }).catch(() => 0),
    prisma.job
      .findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { store: true },
      })
      .catch(() => []),
    prisma.job
      .count({
        where: { status: { in: ["QUEUED", "VALIDATING", "PROCESSING"] } },
      })
      .catch(() => 0),
  ]);

  const completed = recentJobs.filter((j) =>
    ["COMPLETED", "PARTIALLY_COMPLETED"].includes(j.status),
  ).length;
  const failed = recentJobs.filter((j) => j.status === "FAILED").length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">
            Dashboard
          </h1>
          <p className="mt-1 text-ink-500">
            Connected stores, live jobs, and recent activity.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/imports"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            New import
          </Link>
          <Link
            href="/app/exports"
            className="rounded-lg border border-ink-300 bg-white/80 px-4 py-2 text-sm font-semibold"
          >
            New export
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Stores connected", value: storeCount },
          { label: "Running jobs", value: runningJobs },
          { label: "Recent completed", value: completed },
          { label: "Recent failed", value: failed },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-ink-100 bg-white/70 p-5 shadow-soft backdrop-blur"
          >
            <div className="text-sm text-ink-500">{stat.label}</div>
            <div className="mt-2 font-display text-3xl font-bold text-ink-950">
              {stat.value}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white/80 p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent jobs</h2>
          <Link href="/app/jobs" className="text-sm font-medium text-accent">
            View all
          </Link>
        </div>
        {recentJobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-300 bg-sand-50 px-4 py-10 text-center">
            <p className="font-medium text-ink-800">No jobs yet</p>
            <p className="mt-1 text-sm text-ink-500">
              Connect a store and run your first product import or export.
            </p>
            <Link
              href="/app/stores"
              className="mt-4 inline-block text-sm font-semibold text-accent"
            >
              Connect a store →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-ink-100 text-ink-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Store</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Progress</th>
                  <th className="py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => (
                  <tr key={job.id} className="border-b border-ink-100/70">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/app/jobs/${job.id}`}
                        className="font-medium text-ink-900 hover:text-accent"
                      >
                        {job.type.replaceAll("_", " ")}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-ink-500">
                      {job.store.name ?? job.store.shopDomain}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusPill status={job.status} />
                    </td>
                    <td className="py-3 pr-4">{job.progressPercent}%</td>
                    <td className="py-3 text-ink-500">
                      {job.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "FAILED"
      ? "bg-red-100 text-red-800"
      : status === "COMPLETED" || status === "PARTIALLY_COMPLETED"
        ? "bg-accent-muted text-accent"
        : status === "PROCESSING" || status === "VALIDATING"
          ? "bg-amber-100 text-amber-900"
          : "bg-ink-100 text-ink-700";
  return (
    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${tone}`}>
      {status}
    </span>
  );
}
