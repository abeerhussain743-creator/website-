import { z } from "zod";

export const platformSizeSchema = z.enum([
  "FEED_PORTRAIT",
  "FEED_SQUARE",
  "STORY",
  "LINK_PREVIEW",
]);

export const PLATFORM_SIZES: Record<
  z.infer<typeof platformSizeSchema>,
  { width: number; height: number; label: string }
> = {
  FEED_PORTRAIT: { width: 1080, height: 1350, label: "1080×1350 Feed" },
  FEED_SQUARE: { width: 1080, height: 1080, label: "1080×1080 Square" },
  STORY: { width: 1080, height: 1920, label: "1080×1920 Story" },
  LINK_PREVIEW: { width: 1200, height: 627, label: "1200×627 Link" },
};

export const brandKitSchema = z.object({
  primaryColor: z.string().default("#0F3D3E"),
  secondaryColor: z.string().default("#E8D5B7"),
  accentColor: z.string().default("#D97706"),
  backgroundColor: z.string().default("#FAF7F2"),
  textColor: z.string().default("#14212B"),
  fontHeading: z.string().optional(),
  fontBody: z.string().optional(),
  logoUrl: z.string().optional(),
});

export const designContentSchema = z.object({
  headline: z.string(),
  subhead: z.string().optional(),
  body: z.string().optional(),
  cta: z.string().optional(),
  badge: z.string().optional(),
  statValue: z.string().optional(),
  statLabel: z.string().optional(),
  slides: z
    .array(
      z.object({
        title: z.string(),
        body: z.string().optional(),
        emphasis: z.string().optional(),
      }),
    )
    .optional(),
  slideIndex: z.number().int().min(0).optional(),
  businessName: z.string(),
});

export const templateFamilySchema = z.enum([
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
]);

export const renderInputSchema = z.object({
  family: templateFamilySchema,
  size: platformSizeSchema.default("FEED_PORTRAIT"),
  brandKit: brandKitSchema,
  content: designContentSchema,
});

export type BrandKitInput = z.infer<typeof brandKitSchema>;
export type DesignContent = z.infer<typeof designContentSchema>;
export type TemplateFamily = z.infer<typeof templateFamilySchema>;
export type PlatformSize = z.infer<typeof platformSizeSchema>;
export type RenderInput = z.infer<typeof renderInputSchema>;
