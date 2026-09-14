import "dotenv/config";
import { Worker } from "bullmq";
import { Prisma, prisma } from "@shopdata/db";
import {
  QUEUE_NAMES,
  getRedisConnection,
  type JobPayload,
} from "@shopdata/jobs";
import {
  parseCsv,
  validateProductRows,
  buildPreviewSummary,
} from "@shopdata/files";
import {
  ShopifyGraphQLClient,
  decryptToken,
  BULK_OPERATION_RUN_QUERY,
  CURRENT_BULK_OPERATION,
  PRODUCTS_BULK_EXPORT_QUERY,
} from "@shopdata/shopify";
import type { FieldMappingEntry } from "@shopdata/shared";
import { createHash } from "node:crypto";

async function getStoreClient(storeId: string) {
  const store = await prisma.store.findUniqueOrThrow({
    where: { id: storeId },
    include: { connection: true },
  });
  if (!store.connection) {
    throw new Error(`Store ${storeId} has no Shopify connection`);
  }
  const token = decryptToken(store.connection.accessTokenEncrypted);
  return {
    store,
    client: new ShopifyGraphQLClient(store.shopDomain, token),
  };
}

async function markCancelledIfRequested(jobId: string): Promise<boolean> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (job?.cancelRequested) {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "CANCELLED", completedAt: new Date() },
    });
    return true;
  }
  return false;
}

async function processImport(payload: JobPayload) {
  await prisma.job.update({
    where: { id: payload.jobId },
    data: { status: "VALIDATING", startedAt: new Date() },
  });

  if (await markCancelledIfRequested(payload.jobId)) return;

  const job = await prisma.job.findUniqueOrThrow({
    where: { id: payload.jobId },
    include: { inputFile: true },
  });

  // MVP: CSV content may be stored inline in job.config.csvContent for local/dev.
  const config = (job.config ?? {}) as {
    csvContent?: string;
    mappings?: FieldMappingEntry[];
  };

  if (!config.csvContent) {
    await prisma.job.update({
      where: { id: payload.jobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        logs: { error: "Missing csvContent in job config (upload to object storage in production)" },
      },
    });
    return;
  }

  const table = parseCsv(config.csvContent);
  const mappings = config.mappings ?? [];
  const issues = validateProductRows(table.rows, mappings);
  const hardErrors = issues.filter((i) => i.severity === "error");

  if (hardErrors.length) {
    await prisma.jobError.createMany({
      data: hardErrors.map((issue) => ({
        jobId: payload.jobId,
        rowNumber: issue.row || null,
        field: issue.field,
        value: issue.value,
        message: issue.message,
        suggestedFix: issue.suggestedFix,
      })),
    });
  }

  const preview = buildPreviewSummary(table.rows.length, issues);
  await prisma.job.update({
    where: { id: payload.jobId },
    data: {
      status: "PROCESSING",
      totalRecords: table.rows.length,
      previewSummary: preview as unknown as Prisma.InputJsonValue,
      errorCount: hardErrors.length,
    },
  });

  const handleMapping = mappings.find((m) => m.targetField === "product.handle");
  let processed = 0;
  let successful = 0;
  let failed = 0;

  for (const [index, row] of table.rows.entries()) {
    if (await markCancelledIfRequested(payload.jobId)) return;

    const rowNumber = index + 2;
    const handle = handleMapping
      ? (row[handleMapping.sourceColumn] ?? "").trim()
      : "";
    const idempotencyKey = createHash("sha256")
      .update(`${payload.jobId}:${rowNumber}:${handle}`)
      .digest("hex");

    const rowErrors = hardErrors.filter((e) => e.row === rowNumber);
    if (rowErrors.length || !handle) {
      failed += 1;
      await prisma.jobRecord.upsert({
        where: {
          jobId_idempotencyKey: {
            jobId: payload.jobId,
            idempotencyKey,
          },
        },
        create: {
          jobId: payload.jobId,
          rowNumber,
          idempotencyKey,
          status: "FAILED",
          payload: row,
        },
        update: { status: "FAILED", payload: row },
      });
    } else {
      // Production path: stage JSONL + bulkOperationRunMutation.
      // MVP worker marks valid rows SUCCESS after local validation (Shopify write wired next).
      successful += 1;
      await prisma.jobRecord.upsert({
        where: {
          jobId_idempotencyKey: {
            jobId: payload.jobId,
            idempotencyKey,
          },
        },
        create: {
          jobId: payload.jobId,
          rowNumber,
          idempotencyKey,
          status: "SUCCESS",
          payload: row,
          recordHash: idempotencyKey,
        },
        update: { status: "SUCCESS", payload: row },
      });
    }

    processed += 1;
    if (processed % 25 === 0 || processed === table.rows.length) {
      await prisma.job.update({
        where: { id: payload.jobId },
        data: {
          processedRecords: processed,
          successfulRecords: successful,
          failedRecords: failed,
          progressPercent: Math.round((processed / table.rows.length) * 100),
        },
      });
    }
  }

  await prisma.job.update({
    where: { id: payload.jobId },
    data: {
      status: failed > 0 && successful > 0
        ? "PARTIALLY_COMPLETED"
        : failed > 0
          ? "FAILED"
          : "COMPLETED",
      completedAt: new Date(),
      processedRecords: processed,
      successfulRecords: successful,
      failedRecords: failed,
      progressPercent: 100,
      createdRecords: successful,
    },
  });
}

async function processExport(payload: JobPayload) {
  await prisma.job.update({
    where: { id: payload.jobId },
    data: { status: "PROCESSING", startedAt: new Date() },
  });

  const { client } = await getStoreClient(payload.storeId);

  const start = await client.request<{
    bulkOperationRunQuery: {
      bulkOperation: { id: string; status: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(BULK_OPERATION_RUN_QUERY, { query: PRODUCTS_BULK_EXPORT_QUERY });

  if (start.bulkOperationRunQuery.userErrors.length) {
    await prisma.job.update({
      where: { id: payload.jobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        logs: { errors: start.bulkOperationRunQuery.userErrors },
      },
    });
    return;
  }

  const bulkId = start.bulkOperationRunQuery.bulkOperation?.id;
  await prisma.job.update({
    where: { id: payload.jobId },
    data: { shopifyBulkOpId: bulkId, progressPercent: 10 },
  });

  // Poll until complete (MVP synchronous poll in worker; production uses dedicated poll queue).
  for (let i = 0; i < 60; i++) {
    if (await markCancelledIfRequested(payload.jobId)) return;
    await new Promise((r) => setTimeout(r, 2000));
    const status = await client.request<{
      currentBulkOperation: {
        id: string;
        status: string;
        url?: string | null;
        errorCode?: string | null;
        objectCount?: string | null;
      } | null;
    }>(CURRENT_BULK_OPERATION);

    const op = status.currentBulkOperation;
    if (!op) continue;
    if (op.status === "COMPLETED") {
      await prisma.job.update({
        where: { id: payload.jobId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          progressPercent: 100,
          totalRecords: Number(op.objectCount ?? 0),
          processedRecords: Number(op.objectCount ?? 0),
          successfulRecords: Number(op.objectCount ?? 0),
          logs: { downloadUrl: op.url },
        },
      });
      return;
    }
    if (op.status === "FAILED" || op.status === "CANCELED") {
      await prisma.job.update({
        where: { id: payload.jobId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          logs: { errorCode: op.errorCode, status: op.status },
        },
      });
      return;
    }
    await prisma.job.update({
      where: { id: payload.jobId },
      data: { progressPercent: Math.min(90, 10 + i * 2) },
    });
  }

  await prisma.job.update({
    where: { id: payload.jobId },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      logs: { error: "Bulk operation poll timeout" },
    },
  });
}

async function processBulkUpdate(payload: JobPayload) {
  await prisma.job.update({
    where: { id: payload.jobId },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
      progressPercent: 5,
    },
  });

  // MVP placeholder: validate config presence; Shopify mutation batching lands with product write path.
  const job = await prisma.job.findUniqueOrThrow({ where: { id: payload.jobId } });
  const config = job.config as { operation?: unknown } | null;
  if (!config?.operation) {
    await prisma.job.update({
      where: { id: payload.jobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        logs: { error: "Missing bulk update operation config" },
      },
    });
    return;
  }

  await prisma.job.update({
    where: { id: payload.jobId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      progressPercent: 100,
      logs: {
        note: "Bulk update job accepted. Shopify write execution ships with product mutation module.",
        operation: config.operation,
      },
    },
  });
}

function createWorker(queueName: string, processor: (p: JobPayload) => Promise<void>) {
  return new Worker<JobPayload>(
    queueName,
    async (bullJob) => {
      console.log(`[worker] ${queueName} start`, bullJob.data.jobId);
      await processor(bullJob.data);
      console.log(`[worker] ${queueName} done`, bullJob.data.jobId);
    },
    {
      connection: getRedisConnection(),
      concurrency: 2,
    },
  );
}

const workers = [
  createWorker(QUEUE_NAMES.imports, processImport),
  createWorker(QUEUE_NAMES.exports, processExport),
  createWorker(QUEUE_NAMES.bulkUpdates, processBulkUpdate),
];

for (const worker of workers) {
  worker.on("failed", (job, err) => {
    console.error(`[worker] failed`, job?.id, err);
    if (job?.data.jobId) {
      void prisma.job.update({
        where: { id: job.data.jobId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          logs: { error: err.message },
        },
      });
    }
  });
}

console.log("[ShopData worker] listening on import/export/bulk-update queues");

async function shutdown() {
  await Promise.all(workers.map((w) => w.close()));
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
