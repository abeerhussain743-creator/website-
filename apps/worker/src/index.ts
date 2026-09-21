import "dotenv/config";
import { Worker, Queue } from "bullmq";
import { Redis } from "ioredis";
import pino from "pino";
import { prisma } from "@maxtrone/db";
import { createProviders } from "@maxtrone/providers";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const queues = {
  messaging: new Queue("messaging", { connection }),
  ai: new Queue("ai", { connection }),
  schedules: new Queue("schedules", { connection }),
  reports: new Queue("reports", { connection }),
};

const providers = createProviders({
  MESSAGING_PROVIDER: process.env.MESSAGING_PROVIDER,
  AI_PROVIDER: process.env.AI_PROVIDER,
});

type MessagingJob = {
  institutionId: string;
  to: string;
  body: string;
  idempotencyKey: string;
};

async function recordFailure(
  queue: string,
  jobName: string,
  err: unknown,
  payload: unknown,
  institutionId?: string,
) {
  await prisma.jobFailure.create({
    data: {
      institutionId: institutionId ?? null,
      queue,
      jobName,
      payload: payload as object,
      error: err instanceof Error ? err.message : String(err),
      attempts: 1,
      status: "PENDING",
    },
  });
}

const messagingWorker = new Worker<MessagingJob>(
  "messaging",
  async (job) => {
    const result = await providers.messaging.sendText({
      to: job.data.to,
      body: job.data.body,
      idempotencyKey: job.data.idempotencyKey,
    });
    log.info({ jobId: job.id, result }, "message sent");
    return result;
  },
  { connection },
);

messagingWorker.on("failed", async (job, err) => {
  log.error({ err, jobId: job?.id }, "messaging job failed");
  if (job) {
    await recordFailure(
      "messaging",
      job.name,
      err,
      job.data,
      job.data.institutionId,
    );
  }
});

const healthWorker = new Worker(
  "schedules",
  async (job) => {
    if (job.name === "heartbeat") {
      log.info({ at: new Date().toISOString() }, "worker heartbeat");
      return { ok: true };
    }
  },
  { connection },
);

async function main() {
  await queues.schedules.add(
    "heartbeat",
    {},
    {
      repeat: { every: 60_000 },
      jobId: "worker-heartbeat",
      removeOnComplete: 10,
    },
  );

  log.info("Maxtrone worker started (messaging, schedules)");
}

main().catch(async (err) => {
  log.error(err, "worker failed to start");
  process.exit(1);
});

process.on("SIGINT", async () => {
  await Promise.all([
    messagingWorker.close(),
    healthWorker.close(),
    connection.quit(),
  ]);
  process.exit(0);
});
