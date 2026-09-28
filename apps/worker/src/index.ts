import { Worker, Queue } from "bullmq";
import pino from "pino";
import {
  QUEUE_NAMES,
  pingJobSchema,
  pipelineJobSchema,
  publishJobSchema,
  metricsJobSchema,
  redisConnectionFromUrl,
  runWeeklyPipeline,
  publishPlannedPost,
  pullMetrics,
} from "@postpilot/jobs";
import { prisma } from "@postpilot/db";

const log = pino({
  level: process.env.LOG_LEVEL ?? "info",
  name: "postpilot-worker",
});

async function main() {
  const connection = redisConnectionFromUrl();

  const defaultWorker = new Worker(
    QUEUE_NAMES.default,
    async (job) => {
      if (job.name === "ping") {
        const data = pingJobSchema.parse(job.data);
        log.info({ data }, "ping");
        return { ok: true, echo: data.message };
      }
      return { ok: false };
    },
    { connection },
  );

  const pipelineWorker = new Worker(
    QUEUE_NAMES.pipeline,
    async (job) => {
      const data = pipelineJobSchema.parse(job.data);
      log.info({ data }, "pipeline job");
      return runWeeklyPipeline(data);
    },
    { connection, concurrency: 1 },
  );

  const publishWorker = new Worker(
    QUEUE_NAMES.publish,
    async (job) => {
      const data = publishJobSchema.parse(job.data);
      log.info({ data }, "publish job");
      return publishPlannedPost(data.plannedPostId);
    },
    { connection },
  );

  const metricsWorker = new Worker(
    QUEUE_NAMES.metrics,
    async (job) => {
      const data = metricsJobSchema.parse(job.data);
      log.info({ data }, "metrics job");
      return pullMetrics(data.publishedPostId, data.timepoint);
    },
    { connection },
  );

  // Due scheduled jobs poller
  const publishQueue = new Queue(QUEUE_NAMES.publish, { connection });
  const metricsQueue = new Queue(QUEUE_NAMES.metrics, { connection });

  setInterval(async () => {
    try {
      const due = await prisma.scheduledJob.findMany({
        where: {
          status: "PENDING",
          runAt: { lte: new Date() },
        },
        take: 20,
      });
      for (const item of due) {
        await prisma.scheduledJob.update({
          where: { id: item.id },
          data: { status: "ACTIVE", attempts: { increment: 1 } },
        });
        if (item.kind === "PUBLISH_POST" && item.plannedPostId) {
          await publishQueue.add(
            "publish",
            {
              workspaceId: item.workspaceId,
              plannedPostId: item.plannedPostId,
              scheduledJobId: item.id,
            },
            { jobId: item.idempotencyKey ?? item.id },
          );
        }
        if (item.kind === "PULL_METRICS") {
          const payload = item.payloadJson as {
            publishedPostId?: string;
            timepoint?: "H1" | "H24" | "H72" | "D7";
          };
          if (payload.publishedPostId && payload.timepoint) {
            await metricsQueue.add(
              "metrics",
              {
                workspaceId: item.workspaceId,
                publishedPostId: payload.publishedPostId,
                timepoint: payload.timepoint,
              },
              { jobId: item.idempotencyKey ?? item.id },
            );
          }
        }
      }
    } catch (err) {
      log.error({ err }, "scheduler poll failed");
    }
  }, 5000);

  for (const w of [defaultWorker, pipelineWorker, publishWorker, metricsWorker]) {
    w.on("ready", () => log.info({ queue: w.name }, "ready"));
    w.on("failed", (job, err) =>
      log.error({ jobId: job?.id, err }, "job failed"),
    );
  }

  const shutdown = async () => {
    log.info("shutting down");
    await Promise.all([
      defaultWorker.close(),
      pipelineWorker.close(),
      publishWorker.close(),
      metricsWorker.close(),
      publishQueue.close(),
      metricsQueue.close(),
    ]);
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
