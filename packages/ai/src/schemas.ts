import { z } from "zod";

export const brandContextSchema = z.object({
  businessName: z.string(),
  industry: z.string().optional(),
  niche: z.string().optional(),
  usp: z.string().optional(),
  toneSliders: z
    .object({
      formalCasual: z.number().default(50),
      seriousPlayful: z.number().default(50),
      boldSubtle: z.number().default(50),
    })
    .optional(),
  wordsToUse: z.array(z.string()).default([]),
  wordsToAvoid: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  audience: z
    .object({
      demographics: z.string().optional(),
      pains: z.string().optional(),
      desires: z.string().optional(),
    })
    .optional(),
  brandKit: z
    .object({
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      accentColor: z.string().optional(),
      backgroundColor: z.string().optional(),
      textColor: z.string().optional(),
      fontHeading: z.string().optional(),
      fontBody: z.string().optional(),
    })
    .optional(),
});

export const generatePostInputSchema = z.object({
  brand: brandContextSchema,
  platform: z.enum(["INSTAGRAM", "FACEBOOK", "LINKEDIN", "X", "TIKTOK"]),
  format: z.enum([
    "SINGLE_IMAGE",
    "CAROUSEL",
    "REEL",
    "STORY",
    "TEXT",
    "VIDEO",
  ]),
  topic: z.string().min(1).max(500).optional(),
  objective: z
    .enum(["awareness", "engagement", "leads", "sales", "community"])
    .default("engagement"),
  pillar: z.string().optional(),
  feedback: z.string().max(2000).optional(),
  templateFamily: z
    .enum([
      "minimal",
      "bold",
      "editorial",
      "corporate",
      "playful",
      "luxury",
      "quote",
      "stat",
      "listicle",
      "tip",
    ])
    .optional(),
});

export const hookOptionSchema = z.object({
  text: z.string(),
  score: z.number().min(0).max(100),
  type: z.string(),
});

export const qualityScoresSchema = z.object({
  hookStrength: z.number().min(0).max(100),
  brandVoice: z.number().min(0).max(100),
  clarity: z.number().min(0).max(100),
  value: z.number().min(0).max(100),
  originality: z.number().min(0).max(100),
  platformFit: z.number().min(0).max(100),
  cta: z.number().min(0).max(100),
  overall: z.number().min(0).max(100),
});

export const generatedPostSchema = z.object({
  hooks: z.array(hookOptionSchema).min(1).max(5),
  selectedHook: z.string(),
  headline: z.string(),
  subhead: z.string().optional(),
  caption: z.string(),
  hashtags: z.array(z.string()).max(30),
  cta: z.string(),
  altText: z.string(),
  slides: z
    .array(
      z.object({
        title: z.string(),
        body: z.string().optional(),
        emphasis: z.string().optional(),
      }),
    )
    .optional(),
  reelScript: z
    .object({
      hook2s: z.string(),
      scenes: z.array(z.string()),
      onScreenText: z.array(z.string()),
      voiceover: z.string().optional(),
      broll: z.array(z.string()).optional(),
    })
    .optional(),
  templateFamily: z.string(),
  visualDirection: z.string(),
  qualityScores: qualityScoresSchema,
  qualityPassed: z.boolean(),
  provider: z.string(),
});

export type BrandContext = z.infer<typeof brandContextSchema>;
export type GeneratePostInput = z.infer<typeof generatePostInputSchema>;
export type GeneratedPost = z.infer<typeof generatedPostSchema>;
export type QualityScores = z.infer<typeof qualityScoresSchema>;
