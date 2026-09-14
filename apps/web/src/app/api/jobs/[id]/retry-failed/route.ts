import { NextRequest, NextResponse } from "next/server";
import { Prisma, prisma } from "@shopdata/db";
import { enqueueJob } from "@shopdata/jobs";
import type { FieldMappingEntry } from "@shopdata/shared";

/**
 * Creates a follow-up job that reprocesses only previously failed rows.
 */
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      records: { where: { status: "FAILED" } },
      store: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.records.length === 0) {
    return NextResponse.json({ error: "No failed records to retry" }, { status: 400 });
  }

  const config = (job.config ?? {}) as {
    mappings?: FieldMappingEntry[];
    filename?: string;
  };

  const headerSet = new Set<string>();
  for (const record of job.records) {
    const payload = record.payload as Record<string, string> | null;
    if (payload) Object.keys(payload).forEach((k) => headerSet.add(k));
  }
  const headers = Array.from(headerSet);
  const lines = [
    headers.join(","),
    ...job.records.map((record) => {
      const payload = (record.payload ?? {}) as Record<string, string>;
      return headers
        .map((h) => {
          const value = payload[h] ?? "";
          return `"${String(value).replaceAll('"', '""')}"`;
        })
        .join(",");
    }),
  ];

  const retryJob = await prisma.job.create({
    data: {
      organizationId: job.organizationId,
      storeId: job.storeId,
      type: job.type,
      dataset: job.dataset,
      status: "QUEUED",
      mapping: (job.mapping ?? undefined) as Prisma.InputJsonValue | undefined,
      config: {
        csvContent: lines.join("\n"),
        mappings: config.mappings ?? job.mapping,
        filename: `retry-${config.filename ?? "failed.csv"}`,
        retryOfJobId: job.id,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  await enqueueJob({
    jobId: retryJob.id,
    organizationId: retryJob.organizationId,
    storeId: retryJob.storeId,
    type: retryJob.type,
  });

  return NextResponse.json({ jobId: retryJob.id });
}
