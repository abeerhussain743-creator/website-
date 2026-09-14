import { Queue, type ConnectionOptions } from "bullmq";
import type { JobType } from "@shopdata/shared";

export const QUEUE_NAMES = {
  imports: "shopdata-imports",
  exports: "shopdata-exports",
  bulkUpdates: "shopdata-bulk-updates",
  bulkPoll: "shopdata-shopify-bulk-poll",
  notifications: "shopdata-notifications",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface JobPayload {
  jobId: string;
  organizationId: string;
  storeId: string;
  type: JobType;
}

export function getRedisConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      password: parsed.password || undefined,
      maxRetriesPerRequest: null,
    };
  } catch {
    return { host: "127.0.0.1", port: 6379, maxRetriesPerRequest: null };
  }
}

let importQueue: Queue<JobPayload> | null = null;
let exportQueue: Queue<JobPayload> | null = null;
let bulkUpdateQueue: Queue<JobPayload> | null = null;

function getQueue(name: QueueName): Queue<JobPayload> {
  const connection = getRedisConnection();
  if (name === QUEUE_NAMES.imports) {
    importQueue ??= new Queue(name, { connection });
    return importQueue;
  }
  if (name === QUEUE_NAMES.exports) {
    exportQueue ??= new Queue(name, { connection });
    return exportQueue;
  }
  bulkUpdateQueue ??= new Queue(QUEUE_NAMES.bulkUpdates, { connection });
  return bulkUpdateQueue;
}

export function queueForJobType(type: JobType): QueueName {
  switch (type) {
    case "PRODUCT_IMPORT":
      return QUEUE_NAMES.imports;
    case "PRODUCT_EXPORT":
      return QUEUE_NAMES.exports;
    case "PRODUCT_BULK_UPDATE":
      return QUEUE_NAMES.bulkUpdates;
    default:
      return QUEUE_NAMES.imports;
  }
}

export async function enqueueJob(payload: JobPayload) {
  const queueName = queueForJobType(payload.type);
  const queue = getQueue(queueName);
  return queue.add(payload.type, payload, {
    jobId: payload.jobId,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
}

export async function closeQueues() {
  await Promise.all(
    [importQueue, exportQueue, bulkUpdateQueue]
      .filter(Boolean)
      .map((q) => q!.close()),
  );
}
