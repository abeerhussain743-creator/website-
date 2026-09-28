import { z } from "zod";

export const toneSlidersSchema = z.object({
  formalCasual: z.number().min(0).max(100).default(50),
  seriousPlayful: z.number().min(0).max(100).default(50),
  boldSubtle: z.number().min(0).max(100).default(50),
});

export const audienceSchema = z.object({
  demographics: z.string().max(2000).optional().default(""),
  pains: z.string().max(2000).optional().default(""),
  desires: z.string().max(2000).optional().default(""),
});

export const businessStepSchema = z.object({
  businessName: z.string().min(1).max(120),
  websiteUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  industry: z.string().max(120).optional().default(""),
  niche: z.string().max(120).optional().default(""),
  location: z.string().max(120).optional().default(""),
  market: z.string().max(120).optional().default(""),
  productsServices: z.string().max(4000).optional().default(""),
  pricePositioning: z.string().max(120).optional().default(""),
  usp: z.string().max(2000).optional().default(""),
});

export const audienceStepSchema = z.object({
  audience: audienceSchema,
  goals: z.array(z.string()).max(12).default([]),
});

export const toneStepSchema = z.object({
  toneSliders: toneSlidersSchema,
  wordsToUse: z.array(z.string().max(40)).max(40).default([]),
  wordsToAvoid: z.array(z.string().max(40)).max(40).default([]),
  contentLanguages: z.array(z.string().min(2).max(16)).min(1).default(["en"]),
});

export const brandKitStepSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  backgroundColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  textColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  fontHeading: z.string().max(80).optional().default(""),
  fontBody: z.string().max(80).optional().default(""),
  logoMediaId: z.string().cuid().optional(),
});

export const onboardingDataSchema = z.object({
  business: businessStepSchema.partial().optional(),
  audience: audienceStepSchema.partial().optional(),
  tone: toneStepSchema.partial().optional(),
  brandKit: brandKitStepSchema.partial().optional(),
});

export type OnboardingData = z.infer<typeof onboardingDataSchema>;
export type BusinessStep = z.infer<typeof businessStepSchema>;
export type AudienceStep = z.infer<typeof audienceStepSchema>;
export type ToneStep = z.infer<typeof toneStepSchema>;
export type BrandKitStep = z.infer<typeof brandKitStepSchema>;

export const GOAL_OPTIONS = [
  { id: "awareness", label: "Brand awareness" },
  { id: "leads", label: "Leads" },
  { id: "sales", label: "Sales" },
  { id: "community", label: "Community" },
] as const;
