import Link from "next/link";
import { prisma } from "@shopdata/db";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await prisma.job
    .findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { store: true },
    })
    .catch(() => []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Jobs</h1>
        <p className="mt-1 text-ink-500">
          History, progress, and outcomes for every data operation.
        </p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white/80 shadow-soft">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-ink-100 text-ink-500">
            <tr>
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="px-4 py-3 font-medium">Store</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Records</th>
              <th className="px-4 py-3 font-medium">Progress</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-500">
                  No jobs yet.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="border-b border-ink-100/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/jobs/${job.id}`}
                      className="font-medium hover:text-accent"
                    >
                      {job.type.replaceAll("_", " ")}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-500">
                    {job.store.name ?? job.store.shopDomain}
                  </td>
                  <td className="px-4 py-3">{job.status}</td>
                  <td className="px-4 py-3">
                    {job.successfulRecords}/{job.totalRecords}
                    {job.failedRecords > 0 ? ` · ${job.failedRecords} failed` : ""}
                  </td>
                  <td className="px-4 py-3">{job.progressPercent}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
