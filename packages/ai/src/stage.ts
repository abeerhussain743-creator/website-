import { z } from "zod";

export const accountStageSchema = z.enum([
  "LAUNCH",
  "TRACTION",
  "GROWTH",
  "AUTHORITY",
]);

export const stageReportSchema = z.object({
  stage: accountStageSchema,
  score: z.number().min(0).max(100),
  nicheRelative: z.boolean(),
  signals: z.object({
    followers: z.number(),
    engagementRate: z.number(),
    postingConsistency: z.number(),
    reachHealth: z.number(),
    conversionProxy: z.number(),
  }),
  bottlenecks: z.array(z.string()),
  contentMix: z.object({
    reel: z.number(),
    carousel: z.number(),
    single: z.number(),
    story: z.number().optional(),
  }),
  summary: z.string(),
});

export type StageReportResult = z.infer<typeof stageReportSchema>;

export type StageConfig = {
  launchMax?: number;
  tractionMax?: number;
  growthMax?: number;
};

const DEFAULTS: Required<StageConfig> = {
  launchMax: 1000,
  tractionMax: 10000,
  growthMax: 100000,
};

export function diagnoseStage(input: {
  followers: number;
  engagementRate: number; // 0-100 style or 0-1
  postsLast30Days: number;
  avgReach?: number;
  nicheMedianFollowers?: number;
  stageConfig?: StageConfig;
}): StageReportResult {
  const cfg = { ...DEFAULTS, ...(input.stageConfig ?? {}) };
  const er =
    input.engagementRate > 1 ? input.engagementRate : input.engagementRate * 100;
  const nicheMedian = input.nicheMedianFollowers ?? cfg.tractionMax;
  const relativeFollowers = input.followers / Math.max(nicheMedian, 1);

  let stage: StageReportResult["stage"] = "LAUNCH";
  if (input.followers >= cfg.growthMax || relativeFollowers >= 8) stage = "AUTHORITY";
  else if (input.followers >= cfg.tractionMax || relativeFollowers >= 2)
    stage = "GROWTH";
  else if (input.followers >= cfg.launchMax || relativeFollowers >= 0.4)
    stage = "TRACTION";

  const postingConsistency = Math.min(100, (input.postsLast30Days / 12) * 100);
  const reachHealth = Math.min(
    100,
    ((input.avgReach ?? input.followers * 0.2) / Math.max(input.followers, 1)) *
      100 *
      2,
  );
  const conversionProxy = Math.min(100, er * 8);

  const bottlenecks: string[] = [];
  if (postingConsistency < 50) bottlenecks.push("Posting is inconsistent — aim for 3–5×/week.");
  if (er < 2) bottlenecks.push("Engagement rate is soft — hooks and saves need work.");
  if (reachHealth < 40) bottlenecks.push("Reach is weak relative to followers — lean into Reels/shorts.");
  if (stage !== "LAUNCH" && conversionProxy < 35)
    bottlenecks.push("Reach is okay but conversion signals are weak — add soft CTAs.");
  if (!bottlenecks.length) bottlenecks.push("No critical bottleneck — protect consistency and originality.");

  const mix =
    stage === "LAUNCH"
      ? { reel: 55, carousel: 25, single: 15, story: 5 }
      : stage === "TRACTION"
        ? { reel: 40, carousel: 35, single: 20, story: 5 }
        : stage === "GROWTH"
          ? { reel: 30, carousel: 40, single: 25, story: 5 }
          : { reel: 25, carousel: 35, single: 30, story: 10 };

  const score = Math.round(
    Math.min(
      100,
      (Math.log10(Math.max(input.followers, 10)) / 6) * 35 +
        Math.min(er, 8) * 6 +
        postingConsistency * 0.25 +
        reachHealth * 0.15,
    ),
  );

  return stageReportSchema.parse({
    stage,
    score,
    nicheRelative: true,
    signals: {
      followers: input.followers,
      engagementRate: Number(er.toFixed(2)),
      postingConsistency: Math.round(postingConsistency),
      reachHealth: Math.round(reachHealth),
      conversionProxy: Math.round(conversionProxy),
    },
    bottlenecks,
    contentMix: mix,
    summary: `${stage} stage at ${input.followers.toLocaleString()} followers with ${er.toFixed(1)}% engagement. Recommended mix: ${mix.reel}% reels, ${mix.carousel}% carousels, ${mix.single}% singles.`,
  });
}
