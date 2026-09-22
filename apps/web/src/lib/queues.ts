import { Queue } from "bullmq";
import { Redis } from "ioredis";

const globalForQueues = globalThis as unknown as {
  maxtroneQueues?: {
    messaging: Queue;
    imports: Queue;
    schedules: Queue;
    recovery: Queue;
    briefing: Queue;
    invoices: Queue;
  };
  maxtroneRedis?: Redis;
};

function connection() {
  if (!globalForQueues.maxtroneRedis) {
    globalForQueues.maxtroneRedis = new Redis(
      process.env.REDIS_URL ?? "redis://localhost:6379",
      { maxRetriesPerRequest: null },
    );
  }
  return globalForQueues.maxtroneRedis;
}

export function getQueues() {
  if (!globalForQueues.maxtroneQueues) {
    const conn = connection();
    globalForQueues.maxtroneQueues = {
      messaging: new Queue("messaging", { connection: conn }),
      imports: new Queue("imports", { connection: conn }),
      schedules: new Queue("schedules", { connection: conn }),
      recovery: new Queue("recovery", { connection: conn }),
      briefing: new Queue("briefing", { connection: conn }),
      invoices: new Queue("invoices", { connection: conn }),
    };
  }
  return globalForQueues.maxtroneQueues;
}
