import { z } from "zod";
import type { BrandContext } from "./schemas.js";
import type { StageReportResult } from "./stage.js";

export const plannedDaySchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  date: z.string(),
  platforms: z.array(z.enum(["INSTAGRAM", "FACEBOOK", "LINKEDIN", "X", "TIKTOK"])),
  format: z.enum(["SINGLE_IMAGE", "CAROUSEL", "REEL", "STORY", "TEXT", "VIDEO"]),
  pillar: z.string(),
  topic: z.string(),
  hookAngle: z.string(),
  objective: z.enum(["awareness", "engagement", "leads", "sales", "community"]),
  targetPublishAt: z.string(),
  rationale: z.string(),
  templateFamily: z.string(),
});

export const weeklyPlanSchema = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  title: z.string(),
  rationale: z.string(),
  days: z.array(plannedDaySchema).length(7),
});

export type WeeklyPlan = z.infer<typeof weeklyPlanSchema>;

function startOfWeek(d = new Date()): Date {
  const x = new Date(d);
  const day = x.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(12, 0, 0, 0);
  return x;
}

function iso(d: Date) {
  return d.toISOString();
}

function dateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

const TOPICS = [
  "A practical tip your audience can use today",
  "What most brands get wrong in this niche",
  "Behind the scenes of how you deliver quality",
  "A customer-shaped story with a clear takeaway",
  "A myth vs reality carousel",
  "A bold POV on what “good” looks like",
  "A soft CTA tied to your current offer or ritual",
];

export function buildWeeklyPlan(input: {
  brand: BrandContext;
  stage: StageReportResult;
  weekStart?: Date;
  platforms?: Array<"INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "X" | "TIKTOK">;
  promo?: string;
}): WeeklyPlan {
  const weekStart = startOfWeek(input.weekStart ?? new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const platforms = input.platforms?.length ? input.platforms : ["INSTAGRAM"];
  const mix = input.stage.contentMix;
  const formats: Array<WeeklyPlan["days"][number]["format"]> = [];
  const reelN = Math.round((mix.reel / 100) * 7);
  const carN = Math.round((mix.carousel / 100) * 7);
  for (let i = 0; i < reelN; i++) formats.push("REEL");
  for (let i = 0; i < carN; i++) formats.push("CAROUSEL");
  while (formats.length < 7) formats.push("SINGLE_IMAGE");
  // shuffle lightly for variety without RNG dependency
  const rotated = [...formats.slice(2), ...formats.slice(0, 2)];

  const pillars =
    (input.brand as { pillars?: string[] }).pillars ??
    [
      "Craft & expertise",
      "Brand ritual",
      "Customer proof",
      "Community & culture",
      "Offers & launches",
    ];

  const bestHours = [9, 12, 17, 19];
  const days = Array.from({ length: 7 }, (_, dayIndex) => {
    const date = new Date(weekStart);
    date.setUTCDate(weekStart.getUTCDate() + dayIndex);
    const format = rotated[dayIndex]!;
    const pillar = pillars[dayIndex % pillars.length]!;
    let topic = TOPICS[dayIndex]!;
    if (input.promo && dayIndex === 5) {
      topic = `Promo spotlight: ${input.promo}`;
    }
    const hour = bestHours[dayIndex % bestHours.length]!;
    date.setUTCHours(hour, 0, 0, 0);
    const prevFormat = dayIndex > 0 ? rotated[dayIndex - 1] : null;
    const safeFormat =
      prevFormat === format && format === "REEL" ? "CAROUSEL" : format;

    const templateFamily =
      safeFormat === "CAROUSEL"
        ? "listicle"
        : safeFormat === "REEL"
          ? "bold"
          : dayIndex % 2 === 0
            ? "editorial"
            : "tip";

    const objective =
      input.stage.stage === "LAUNCH"
        ? dayIndex % 2 === 0
          ? "awareness"
          : "engagement"
        : input.stage.stage === "AUTHORITY"
          ? dayIndex === 5
            ? "sales"
            : "community"
          : dayIndex % 3 === 0
            ? "leads"
            : "engagement";

    return plannedDaySchema.parse({
      dayIndex,
      date: dateOnly(date),
      platforms,
      format: safeFormat,
      pillar,
      topic,
      hookAngle:
        safeFormat === "REEL"
          ? "Pattern interrupt in first 2 seconds"
          : "Curiosity gap + concrete promise",
      objective,
      targetPublishAt: iso(date),
      rationale: `Stage ${input.stage.stage} mix favors ${safeFormat}. Pillar “${pillar}” with ${objective} objective.`,
      templateFamily,
    });
  });

  // enforce no back-to-back same pillar
  for (let i = 1; i < days.length; i++) {
    if (days[i]!.pillar === days[i - 1]!.pillar) {
      days[i]!.pillar = pillars[(i + 2) % pillars.length]!;
    }
  }

  return weeklyPlanSchema.parse({
    weekStart: dateOnly(weekStart),
    weekEnd: dateOnly(weekEnd),
    title: `${input.brand.businessName} — Week of ${dateOnly(weekStart)}`,
    rationale: `Built for ${input.stage.stage} with mix ${mix.reel}/${mix.carousel}/${mix.single} (reel/carousel/single).`,
    days,
  });
}
