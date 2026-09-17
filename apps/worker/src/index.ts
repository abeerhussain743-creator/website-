import path from "node:path";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: path.resolve(process.cwd(), "../../.env") });
loadDotenv({ path: path.resolve(process.cwd(), ".env") });

import { createHash } from "node:crypto";
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
  buildProductSetJsonl,
  buildErrorReportCsv,
  productExportJsonlToCsv,
  parseProductExportJsonl,
  applyBulkUpdateToProducts,
  buildBulkUpdateProductSetJsonl,
  demoProductsForDryRun,
  csvOrTableToXlsx,
} from "@shopdata/files";
import {
  ShopifyGraphQLClient,
  decryptToken,
  BULK_OPERATION_RUN_QUERY,
  PRODUCTS_BULK_EXPORT_QUERY,
  createStagedUpload,
  uploadToStagedTarget,
  runBulkMutation,
  pollBulkOperation,
  downloadText,
  parseBulkMutationResults,
  shouldDryRunShopifyWrites,
} from "@shopdata/shopify";
import { buildStorageKey, putObject, getObjectText } from "@shopdata/storage";
import { AppError, type FieldMappingEntry } from "@shopdata/shared";

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
    token,
    dryRun: shouldDryRunShopifyWrites(token),
    client: new ShopifyGraphQLClient(store.shopDomain, token),
  };
}

async function markCancelledIfRequested(jobId: string): Promise<boolean> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job?.cancelRequested) return false;
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "CANCELLED", completedAt: new Date() },
  });
  return true;
}

async function persistFile(params: {
  organizationId: string;
  storeId: string;
  kind: "UPLOAD" | "EXPORT" | "ERROR_REPORT" | "BACKUP" | "TEMPLATE";
  filename: string;
  contentType: string;
  body: string | Buffer;
}) {
  const key = buildStorageKey({
    organizationId: params.organizationId,
    kind: params.kind.toLowerCase(),
    filename: params.filename,
  });
  const stored = await putObject({
    key,
    body: params.body,
    contentType: params.contentType,
  });
  return prisma.fileObject.create({
    data: {
      organizationId: params.organizationId,
      storeId: params.storeId,
      kind: params.kind,
      filename: params.filename,
      contentType: params.contentType,
      sizeBytes: BigInt(stored.sizeBytes),
      storageKey: stored.key,
      checksum: createHash("sha256")
        .update(
          Buffer.isBuffer(params.body) ? params.body : Buffer.from(params.body),
        )
        .digest("hex"),
    },
  });
}

function rowIdempotencyKey(jobId: string, rowNumber: number, handle: string) {
  return createHash("sha256")
    .update(`${jobId}:${rowNumber}:${handle}`)
    .digest("hex");
}

function handleFromRow(
  row: Record<string, string>,
  mappings: FieldMappingEntry[],
) {
  const mapping = mappings.find((m) => m.targetField === "product.handle");
  if (!mapping) return "";
  return (row[mapping.sourceColumn] ?? "").trim();
}

async function processImport(payload: JobPayload) {
  await prisma.job.update({
    where: { id: payload.jobId },
    data: { status: "VALIDATING", startedAt: new Date(), progressPercent: 5 },
  });
  if (await markCancelledIfRequested(payload.jobId)) return;

  const job = await prisma.job.findUniqueOrThrow({
    where: { id: payload.jobId },
    include: { inputFile: true },
  });
  const config = (job.config ?? {}) as {
    csvContent?: string;
    mappings?: FieldMappingEntry[];
    filename?: string;
    storageKey?: string;
  };
  const mappings =
    config.mappings ?? ((job.mapping as FieldMappingEntry[] | null) ?? []);

  let csvContent = config.csvContent;
  if (!csvContent && job.inputFile?.storageKey) {
    csvContent = await getObjectText(job.inputFile.storageKey);
  } else if (!csvContent && config.storageKey) {
    csvContent = await getObjectText(config.storageKey);
  }

  if (!csvContent) {
    await prisma.job.update({
      where: { id: payload.jobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        logs: { error: "Missing csvContent / input file for import job" },
      },
    });
    return;
  }

  let inputFileId = job.inputFileId ?? undefined;
  if (!inputFileId) {
    const inputFile = await persistFile({
      organizationId: payload.organizationId,
      storeId: payload.storeId,
      kind: "UPLOAD",
      filename: config.filename ?? "import.csv",
      contentType: "text/csv",
      body: csvContent,
    });
    inputFileId = inputFile.id;
  }

  const table = parseCsv(csvContent);
  const issues = validateProductRows(table.rows, mappings);
  const hardErrors = issues.filter((i) => i.severity === "error");
  const skipRows = new Set(
    hardErrors.filter((e) => e.row > 0).map((e) => e.row),
  );

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
      inputFileId,
      totalRecords: table.rows.length,
      previewSummary: preview as unknown as Prisma.InputJsonValue,
      errorCount: hardErrors.length,
      progressPercent: 15,
    },
  });

  const { jsonl, includedRowNumbers } = buildProductSetJsonl(
    table.rows,
    mappings,
    { skipRows },
  );

  if (!jsonl.trim()) {
    const errorFile = await persistFile({
      organizationId: payload.organizationId,
      storeId: payload.storeId,
      kind: "ERROR_REPORT",
      filename: `errors-${payload.jobId}.csv`,
      contentType: "text/csv",
      body: buildErrorReportCsv(
        hardErrors.map((e) => ({
          rowNumber: e.row,
          field: e.field,
          value: e.value,
          message: e.message,
          suggestedFix: e.suggestedFix,
        })),
      ),
    });
    await prisma.job.update({
      where: { id: payload.jobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        failedRecords: hardErrors.length,
        processedRecords: table.rows.length,
        progressPercent: 100,
        errorFileId: errorFile.id,
        logs: { error: "No valid rows to import after validation" },
      },
    });
    return;
  }

  await persistFile({
    organizationId: payload.organizationId,
    storeId: payload.storeId,
    kind: "UPLOAD",
    filename: `product-set-${payload.jobId}.jsonl`,
    contentType: "application/x-ndjson",
    body: jsonl,
  });

  const { client, dryRun } = await getStoreClient(payload.storeId);
  let successful = 0;
  let failed = 0;
  const skipped = skipRows.size;

  if (dryRun) {
    for (const [index, rowNumber] of includedRowNumbers.entries()) {
      if (await markCancelledIfRequested(payload.jobId)) return;
      const row = table.rows[rowNumber - 2]!;
      const handle = handleFromRow(row, mappings);
      const idempotencyKey = rowIdempotencyKey(
        payload.jobId,
        rowNumber,
        handle,
      );
      await prisma.jobRecord.upsert({
        where: {
          jobId_idempotencyKey: { jobId: payload.jobId, idempotencyKey },
        },
        create: {
          jobId: payload.jobId,
          rowNumber,
          idempotencyKey,
          status: "SUCCESS",
          payload: row,
          recordHash: idempotencyKey,
          result: { dryRun: true, handle },
        },
        update: {
          status: "SUCCESS",
          payload: row,
          result: { dryRun: true, handle },
        },
      });
      successful += 1;
      if ((index + 1) % 25 === 0 || index + 1 === includedRowNumbers.length) {
        await prisma.job.update({
          where: { id: payload.jobId },
          data: {
            processedRecords: successful + failed + skipped,
            successfulRecords: successful,
            failedRecords: failed,
            skippedRecords: skipped,
            progressPercent: Math.min(
              95,
              20 + Math.round(((index + 1) / includedRowNumbers.length) * 70),
            ),
          },
        });
      }
    }
  } else {
    const staged = await createStagedUpload(
      client,
      `import-${payload.jobId}.jsonl`,
    );
    const stagedPath = await uploadToStagedTarget(staged, jsonl);
    const bulkOp = await runBulkMutation(client, stagedPath);
    await prisma.job.update({
      where: { id: payload.jobId },
      data: {
        shopifyBulkOpId: bulkOp.id,
        progressPercent: 35,
        logs: {
          stagedPath,
          bulkOperationId: bulkOp.id,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    const completed = await pollBulkOperation(client, {
      shouldCancel: async () => markCancelledIfRequested(payload.jobId),
      onProgress: async (attempt) => {
        await prisma.job.update({
          where: { id: payload.jobId },
          data: { progressPercent: Math.min(90, 35 + attempt) },
        });
      },
    }).catch(async (error) => {
      if (error instanceof AppError && error.code === "BULK_CANCELLED") {
        return null;
      }
      throw error;
    });
    if (!completed) return;

    const resultJsonl = completed.url ? await downloadText(completed.url) : "";
    const results = parseBulkMutationResults(resultJsonl);

    for (const [index, rowNumber] of includedRowNumbers.entries()) {
      const row = table.rows[rowNumber - 2]!;
      const handle = handleFromRow(row, mappings);
      const idempotencyKey = rowIdempotencyKey(
        payload.jobId,
        rowNumber,
        handle,
      );
      const result = results[index];
      const ok = Boolean(result?.success);
      if (ok) successful += 1;
      else {
        failed += 1;
        await prisma.jobError.create({
          data: {
            jobId: payload.jobId,
            rowNumber,
            field: "shopify",
            message:
              result?.errors.join("; ") || "Shopify bulk mutation failed",
            suggestedFix: "Fix the row data and retry failed records",
          },
        });
      }
      await prisma.jobRecord.upsert({
        where: {
          jobId_idempotencyKey: { jobId: payload.jobId, idempotencyKey },
        },
        create: {
          jobId: payload.jobId,
          rowNumber,
          idempotencyKey,
          status: ok ? "SUCCESS" : "FAILED",
          shopifyGid: result?.productId,
          payload: row,
          recordHash: idempotencyKey,
          result: (result ?? {
            success: false,
          }) as unknown as Prisma.InputJsonValue,
        },
        update: {
          status: ok ? "SUCCESS" : "FAILED",
          shopifyGid: result?.productId,
          payload: row,
          result: (result ?? {
            success: false,
          }) as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  for (const rowNumber of skipRows) {
    const row = table.rows[rowNumber - 2];
    if (!row) continue;
    const handle = handleFromRow(row, mappings);
    const idempotencyKey = rowIdempotencyKey(payload.jobId, rowNumber, handle);
    await prisma.jobRecord.upsert({
      where: {
        jobId_idempotencyKey: { jobId: payload.jobId, idempotencyKey },
      },
      create: {
        jobId: payload.jobId,
        rowNumber,
        idempotencyKey,
        status: "SKIPPED",
        payload: row,
      },
      update: { status: "SKIPPED", payload: row },
    });
  }

  const allErrors = await prisma.jobError.findMany({
    where: { jobId: payload.jobId },
    orderBy: { rowNumber: "asc" },
  });

  let errorFileId: string | undefined;
  if (allErrors.length) {
    const errorFile = await persistFile({
      organizationId: payload.organizationId,
      storeId: payload.storeId,
      kind: "ERROR_REPORT",
      filename: `errors-${payload.jobId}.csv`,
      contentType: "text/csv",
      body: buildErrorReportCsv(
        allErrors.map((e) => ({
          rowNumber: e.rowNumber,
          field: e.field,
          value: e.value,
          message: e.message,
          suggestedFix: e.suggestedFix,
        })),
      ),
    });
    errorFileId = errorFile.id;
  }

  await prisma.job.update({
    where: { id: payload.jobId },
    data: {
      status:
        failed > 0 && successful > 0
          ? "PARTIALLY_COMPLETED"
          : failed > 0
            ? "FAILED"
            : "COMPLETED",
      completedAt: new Date(),
      processedRecords: successful + failed + skipped,
      successfulRecords: successful,
      failedRecords: failed,
      skippedRecords: skipped,
      createdRecords: successful,
      errorCount: allErrors.length,
      progressPercent: 100,
      errorFileId,
      logs: {
        dryRun,
        includedRows: includedRowNumbers.length,
        skipped,
      } as unknown as Prisma.InputJsonValue,
    },
  });
}

async function processExport(payload: JobPayload) {
  await prisma.job.update({
    where: { id: payload.jobId },
    data: { status: "PROCESSING", startedAt: new Date(), progressPercent: 5 },
  });

  const job = await prisma.job.findUniqueOrThrow({
    where: { id: payload.jobId },
  });
  const format = String(
    ((job.config as { format?: string } | null)?.format ?? "CSV"),
  ).toUpperCase();
  const wantXlsx = format === "XLSX" || format === "XLS";

  const { client, dryRun } = await getStoreClient(payload.storeId);

  const persistExport = async (csv: string, objectCount: number, logs: object) => {
    if (wantXlsx) {
      const xlsx = csvOrTableToXlsx(csv);
      const outputFile = await persistFile({
        organizationId: payload.organizationId,
        storeId: payload.storeId,
        kind: "EXPORT",
        filename: `export-${payload.jobId}.xlsx`,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        body: xlsx,
      });
      await prisma.job.update({
        where: { id: payload.jobId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          progressPercent: 100,
          totalRecords: objectCount,
          processedRecords: objectCount,
          successfulRecords: objectCount,
          outputFileId: outputFile.id,
          logs: { ...logs, format: "XLSX" } as unknown as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const outputFile = await persistFile({
      organizationId: payload.organizationId,
      storeId: payload.storeId,
      kind: "EXPORT",
      filename: `export-${payload.jobId}.csv`,
      contentType: "text/csv",
      body: csv,
    });
    await prisma.job.update({
      where: { id: payload.jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        progressPercent: 100,
        totalRecords: objectCount,
        processedRecords: objectCount,
        successfulRecords: objectCount,
        outputFileId: outputFile.id,
        logs: { ...logs, format: "CSV" } as unknown as Prisma.InputJsonValue,
      },
    });
  };

  if (dryRun) {
    const csv =
      "Handle,Title,Vendor,Product Type,Tags,Status,SKU,Price,Compare At Price,Barcode,Inventory Quantity\n" +
      "demo-product,Demo Product,ShopData,Demo,demo,ACTIVE,DEMO-1,19.99,,,\n";
    await persistExport(csv, 1, { dryRun: true });
    return;
  }

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

  await prisma.job.update({
    where: { id: payload.jobId },
    data: {
      shopifyBulkOpId: start.bulkOperationRunQuery.bulkOperation?.id,
      progressPercent: 15,
    },
  });

  const completed = await pollBulkOperation(client, {
    shouldCancel: async () => markCancelledIfRequested(payload.jobId),
    onProgress: async (attempt) => {
      await prisma.job.update({
        where: { id: payload.jobId },
        data: { progressPercent: Math.min(85, 15 + attempt) },
      });
    },
  }).catch(async (error) => {
    if (error instanceof AppError && error.code === "BULK_CANCELLED") {
      return null;
    }
    throw error;
  });
  if (!completed) return;

  const jsonl = completed.url ? await downloadText(completed.url) : "";
  const csv = productExportJsonlToCsv(jsonl);
  const objectCount = Number(completed.objectCount ?? 0);
  await persistExport(csv, objectCount, {
    downloadUrl: completed.url,
    objectCount,
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
  if (await markCancelledIfRequested(payload.jobId)) return;

  const job = await prisma.job.findUniqueOrThrow({
    where: { id: payload.jobId },
  });
  const config = job.config as {
    operation?: {
      field: "price" | "compareAtPrice" | "inventoryQuantity" | "status" | "tags";
      mode: "set" | "percent" | "add" | "subtract";
      value: string;
    };
  } | null;

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

  const { client, dryRun } = await getStoreClient(payload.storeId);
  let products;

  if (dryRun) {
    products = demoProductsForDryRun();
  } else {
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

    await prisma.job.update({
      where: { id: payload.jobId },
      data: {
        shopifyBulkOpId: start.bulkOperationRunQuery.bulkOperation?.id,
        progressPercent: 20,
      },
    });

    const completed = await pollBulkOperation(client, {
      shouldCancel: async () => markCancelledIfRequested(payload.jobId),
      onProgress: async (attempt) => {
        await prisma.job.update({
          where: { id: payload.jobId },
          data: { progressPercent: Math.min(55, 20 + attempt) },
        });
      },
    }).catch(async (error) => {
      if (error instanceof AppError && error.code === "BULK_CANCELLED") {
        return null;
      }
      throw error;
    });
    if (!completed) return;

    const jsonl = completed.url ? await downloadText(completed.url) : "";
    products = parseProductExportJsonl(jsonl);
  }

  const { products: updated, changed, unchanged } = applyBulkUpdateToProducts(
    products,
    config.operation,
  );

  await prisma.job.update({
    where: { id: payload.jobId },
    data: {
      progressPercent: 60,
      totalRecords: updated.length,
      previewSummary: {
        dataset: "PRODUCTS",
        totalRows: updated.length,
        creates: 0,
        updates: changed,
        unchanged,
        errors: 0,
        warnings: 0,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  if (changed === 0) {
    await prisma.job.update({
      where: { id: payload.jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        progressPercent: 100,
        processedRecords: updated.length,
        successfulRecords: 0,
        skippedRecords: unchanged,
        updatedRecords: 0,
        logs: {
          dryRun,
          note: "No product fields changed for this operation",
          operation: config.operation,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    return;
  }

  const { jsonl, count } = buildBulkUpdateProductSetJsonl(updated);

  if (dryRun) {
    await prisma.job.update({
      where: { id: payload.jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        progressPercent: 100,
        processedRecords: updated.length,
        successfulRecords: count,
        updatedRecords: changed,
        skippedRecords: unchanged,
        logs: {
          dryRun: true,
          operation: config.operation,
          changed,
          unchanged,
          sample: updated.slice(0, 3),
        } as unknown as Prisma.InputJsonValue,
      },
    });
    return;
  }

  const staged = await createStagedUpload(
    client,
    `bulk-update-${payload.jobId}.jsonl`,
  );
  const stagedPath = await uploadToStagedTarget(staged, jsonl);
  const bulkOp = await runBulkMutation(client, stagedPath);
  await prisma.job.update({
    where: { id: payload.jobId },
    data: {
      shopifyBulkOpId: bulkOp.id,
      progressPercent: 75,
    },
  });

  const writeCompleted = await pollBulkOperation(client, {
    shouldCancel: async () => markCancelledIfRequested(payload.jobId),
    onProgress: async (attempt) => {
      await prisma.job.update({
        where: { id: payload.jobId },
        data: { progressPercent: Math.min(95, 75 + attempt) },
      });
    },
  }).catch(async (error) => {
    if (error instanceof AppError && error.code === "BULK_CANCELLED") {
      return null;
    }
    throw error;
  });
  if (!writeCompleted) return;

  const resultJsonl = writeCompleted.url
    ? await downloadText(writeCompleted.url)
    : "";
  const results = parseBulkMutationResults(resultJsonl);
  const successful = results.filter((r) => r.success).length;
  const failed = results.length - successful;

  await prisma.job.update({
    where: { id: payload.jobId },
    data: {
      status:
        failed > 0 && successful > 0
          ? "PARTIALLY_COMPLETED"
          : failed > 0
            ? "FAILED"
            : "COMPLETED",
      completedAt: new Date(),
      progressPercent: 100,
      processedRecords: results.length || count,
      successfulRecords: successful || (failed === 0 ? count : successful),
      failedRecords: failed,
      updatedRecords: successful || (failed === 0 ? changed : successful),
      skippedRecords: unchanged,
      logs: {
        dryRun: false,
        operation: config.operation,
        changed,
        unchanged,
        bulkOperationId: bulkOp.id,
      } as unknown as Prisma.InputJsonValue,
    },
  });
}

function createWorker(
  queueName: string,
  processor: (payload: JobPayload) => Promise<void>,
) {
  return new Worker<JobPayload>(
    queueName,
    async (bullJob) => {
      console.log(`[worker] ${queueName} start`, bullJob.data.jobId);
      await processor(bullJob.data);
      console.log(`[worker] ${queueName} done`, bullJob.data.jobId);
    },
    { connection: getRedisConnection(), concurrency: 2 },
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
