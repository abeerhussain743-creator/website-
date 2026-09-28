import { z } from "zod";

export const QUEUE_NAMES = {
  default: "postpilot-default",
  pipeline: "postpilot-pipeline",
  publish: "postpilot-publish",
  metrics: "postpilot-metrics",
} as const;

export const pingJobSchema = z.object({
  message: z.string().default("pong"),
  workspaceId: z.string().optional(),
});

export type PingJob = z.infer<typeof pingJobSchema>;

export function redisConnectionFromUrl(url = process.env.REDIS_URL) {
  if (!url) {
    throw new Error("REDIS_URL is required");
  }
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
  };
}
