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

export const pipelineJobSchema = z.object({
  workspaceId: z.string(),
  pipelineRunId: z.string(),
  step: z.enum([
    "REFRESH_COMPETITORS",
    "ANALYZE_COMPETITOR_POSTS",
    "UPDATE_NICHE_PLAYBOOK",
    "SYNC_OWN_ACCOUNT_METRICS",
    "DIAGNOSE_STAGE",
    "BUILD_WEEKLY_PLAN",
    "GENERATE_POSTS",
    "QUALITY_CRITIC",
    "RENDER_DESIGNS",
    "NOTIFY_FOR_APPROVAL",
    "FULL",
  ]),
  weekStart: z.string().optional(),
  promo: z.string().optional(),
  triggeredById: z.string().optional(),
});

export const publishJobSchema = z.object({
  workspaceId: z.string(),
  plannedPostId: z.string(),
  scheduledJobId: z.string().optional(),
});

export const metricsJobSchema = z.object({
  workspaceId: z.string(),
  publishedPostId: z.string(),
  timepoint: z.enum(["H1", "H24", "H72", "D7"]),
});

export type PingJob = z.infer<typeof pingJobSchema>;
export type PipelineJob = z.infer<typeof pipelineJobSchema>;
export type PublishJob = z.infer<typeof publishJobSchema>;
export type MetricsJob = z.infer<typeof metricsJobSchema>;

export const PIPELINE_STEPS = [
  "REFRESH_COMPETITORS",
  "ANALYZE_COMPETITOR_POSTS",
  "UPDATE_NICHE_PLAYBOOK",
  "SYNC_OWN_ACCOUNT_METRICS",
  "DIAGNOSE_STAGE",
  "BUILD_WEEKLY_PLAN",
  "GENERATE_POSTS",
  "QUALITY_CRITIC",
  "RENDER_DESIGNS",
  "NOTIFY_FOR_APPROVAL",
] as const;

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

export {
  runWeeklyPipeline,
  approvePlannedPost,
  scheduleApprovedPosts,
  publishPlannedPost,
  pullMetrics,
  buildWeeklyReport,
} from "./pipeline.js";
