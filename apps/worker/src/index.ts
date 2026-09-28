import { Worker } from "bullmq";
import pino from "pino";
import {
  QUEUE_NAMES,
  pingJobSchema,
  redisConnectionFromUrl,
} from "@postpilot/jobs";

const log = pino({
  level: process.env.LOG_LEVEL ?? "info",
  name: "postpilot-worker",
});

async function main() {
  const connection = redisConnectionFromUrl();

  const worker = new Worker(
    QUEUE_NAMES.default,
    async (job) => {
      if (job.name === "ping") {
        const data = pingJobSchema.parse(job.data);
        log.info({ data }, "ping job");
        return { ok: true, echo: data.message };
      }
      log.warn({ name: job.name }, "unknown job");
      return { ok: false };
    },
    { connection },
  );

  worker.on("ready", () => log.info("worker ready"));
  worker.on("failed", (job, err) =>
    log.error({ jobId: job?.id, err }, "job failed"),
  );

  const shutdown = async () => {
    log.info("shutting down");
    await worker.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
