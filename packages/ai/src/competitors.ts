import { z } from "zod";

export const competitorInsightSchema = z.object({
  handle: z.string(),
  platform: z.enum(["INSTAGRAM", "FACEBOOK", "LINKEDIN", "X", "TIKTOK"]),
  tier: z.enum(["RISING_STAR", "CATEGORY_LEADER", "DIRECT_RIVAL", "WATCHLIST"]),
  momentumScore: z.number(),
  relevanceScore: z.number(),
  followers: z.number(),
  growth7dPct: z.number(),
  engagementRate: z.number(),
  why: z.string(),
});

export const nichePlaybookSchema = z.object({
  winningFormats: z.array(z.object({ format: z.string(), why: z.string(), share: z.number() })),
  hookPatterns: z.array(z.string()),
  topicClusters: z.array(z.string()),
  bestPostingWindows: z.array(z.object({ day: z.string(), hours: z.array(z.number()) })),
  trendingThemes: z.array(z.string()),
  contentGaps: z.array(z.string()),
  whatChanged: z.array(z.string()),
});

export type NichePlaybookDoc = z.infer<typeof nichePlaybookSchema>;

export function discoverCompetitors(input: {
  businessName: string;
  niche?: string;
  industry?: string;
}): z.infer<typeof competitorInsightSchema>[] {
  const niche = input.niche || input.industry || "brand";
  const base = niche.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const seeds = [
    { handle: `${base}lab`, tier: "RISING_STAR" as const, followers: 8200, growth: 12.4, er: 4.8, mom: 86 },
    { handle: `${base}journal`, tier: "CATEGORY_LEADER" as const, followers: 128000, growth: 1.2, er: 1.9, mom: 62 },
    { handle: `get${base}`, tier: "DIRECT_RIVAL" as const, followers: 24500, growth: 5.1, er: 3.2, mom: 74 },
    { handle: `${base}club`, tier: "RISING_STAR" as const, followers: 4100, growth: 18.2, er: 6.1, mom: 91 },
    { handle: `daily${base}`, tier: "WATCHLIST" as const, followers: 15600, growth: 2.4, er: 2.2, mom: 55 },
  ];
  return seeds.map((s) =>
    competitorInsightSchema.parse({
      handle: s.handle,
      platform: "INSTAGRAM",
      tier: s.tier,
      momentumScore: s.mom,
      relevanceScore: 70 + Math.min(20, s.growth),
      followers: s.followers,
      growth7dPct: s.growth,
      engagementRate: s.er,
      why:
        s.tier === "RISING_STAR"
          ? `Fast follower velocity (+${s.growth}% / 7d) with strong engagement for size.`
          : s.tier === "CATEGORY_LEADER"
            ? "Largest share of voice; useful for benchmark formats."
            : s.tier === "DIRECT_RIVAL"
              ? `Closest offer overlap with ${input.businessName}.`
              : "Worth monitoring for emerging hooks.",
    }),
  );
}

export function buildNichePlaybook(niche: string): NichePlaybookDoc {
  return nichePlaybookSchema.parse({
    winningFormats: [
      { format: "REEL", why: "Highest reach for discovery in this niche", share: 42 },
      { format: "CAROUSEL", why: "Best saves and trust-building", share: 33 },
      { format: "SINGLE_IMAGE", why: "Strong for quotes and offer moments", share: 25 },
    ],
    hookPatterns: [
      "Contrarian claim about common advice",
      "Numbered promise (“3 signals…”)",
      "Pain → quieter fix",
      "Before/after ritual",
    ],
    topicClusters: [
      `${niche} foundations`,
      "Quality vs hype",
      "Customer rituals",
      "Behind the craft",
      "Soft seasonal offers",
    ],
    bestPostingWindows: [
      { day: "Tue", hours: [9, 12, 18] },
      { day: "Wed", hours: [11, 17] },
      { day: "Thu", hours: [9, 19] },
      { day: "Sat", hours: [10, 16] },
    ],
    trendingThemes: [
      "Quiet luxury / anti-hustle framing",
      "Process transparency",
      "Micro-education carousels",
    ],
    contentGaps: [
      "Few competitors show authentic failure → lesson posts",
      "Underused local/community storytelling",
      "Weak CTAs that aren't hard sells",
    ],
    whatChanged: [
      "Rising accounts posting Reels 4–5×/week",
      "Carousel saves outperforming vanity likes",
      "Shorter hooks winning in first 2 seconds",
    ],
  });
}
