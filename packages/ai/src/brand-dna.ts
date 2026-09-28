import { z } from "zod";
import type { BrandContext } from "./schemas.js";

export const brandDnaSchema = z.object({
  voiceRules: z.object({
    tone: z.string(),
    sentenceLength: z.string(),
    perspective: z.string(),
    emojiPolicy: z.string(),
  }),
  contentPillars: z.array(
    z.object({
      name: z.string(),
      weight: z.number(),
      description: z.string(),
    }),
  ),
  audiencePersona: z.object({
    name: z.string(),
    summary: z.string(),
    pains: z.array(z.string()),
    desires: z.array(z.string()),
  }),
  doList: z.array(z.string()),
  dontList: z.array(z.string()),
  visualStyleGuide: z.object({
    photography: z.string(),
    typography: z.string(),
    colorUse: z.string(),
    avoid: z.string(),
  }),
  provenHooks: z.array(z.string()).default([]),
  rawDocument: z.string(),
});

export type BrandDnaDocument = z.infer<typeof brandDnaSchema>;

export function generateBrandDna(brand: BrandContext): BrandDnaDocument {
  const niche = brand.niche || brand.industry || "the category";
  const tone = brand.toneSliders ?? {
    formalCasual: 50,
    seriousPlayful: 50,
    boldSubtle: 50,
  };
  const casual = tone.formalCasual >= 55;
  const playful = tone.seriousPlayful >= 55;
  const bold = tone.boldSubtle <= 45;
  const voiceTone = [
    casual ? "conversational" : "composed",
    playful ? "warm" : "grounded",
    bold ? "direct" : "refined",
  ].join(", ");

  const pillars = [
    {
      name: "Craft & expertise",
      weight: 30,
      description: `Teach something concrete about ${niche}.`,
    },
    {
      name: "Brand ritual",
      weight: 25,
      description: `Show the recurring experience that makes ${brand.businessName} unmistakable.`,
    },
    {
      name: "Customer proof",
      weight: 20,
      description: "Stories, outcomes, and social proof without hype.",
    },
    {
      name: "Community & culture",
      weight: 15,
      description: "Invite belonging; ask real questions.",
    },
    {
      name: "Offers & launches",
      weight: 10,
      description: "Soft CTAs tied to genuine value.",
    },
  ];

  const personaName = brand.businessName.split(" ")[0] === "The" ? "Alex" : "Maya";
  const dna: BrandDnaDocument = {
    voiceRules: {
      tone: voiceTone,
      sentenceLength: casual ? "short to medium" : "medium",
      perspective: "first-person plural or brand-as-guide",
      emojiPolicy: playful ? "sparingly, only if on-brand" : "mostly none",
    },
    contentPillars: pillars,
    audiencePersona: {
      name: personaName,
      summary:
        brand.audience?.demographics ||
        `Someone who cares about quality in ${niche} and is tired of generic content.`,
      pains: (brand.audience?.pains || "noise, inconsistency, empty claims")
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4),
      desires: (brand.audience?.desires || "clarity, trust, a better ritual")
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4),
    },
    doList: [
      "Lead with a sharp hook in the first line",
      `Reference ${niche} specifics, not generic motivation`,
      ...(brand.wordsToUse ?? []).slice(0, 3).map((w) => `Prefer the word “${w}” when natural`),
      "End with a human CTA (save, reply, ritual)",
    ],
    dontList: [
      "Copy competitor captions or visual layouts",
      "Hard-sell every post",
      ...(brand.wordsToAvoid ?? []).slice(0, 4).map((w) => `Avoid “${w}”`),
      "Use empty hype (“game-changer”, “crushing it”)",
    ],
    visualStyleGuide: {
      photography: `Natural, atmospheric imagery that feels like ${niche} — product and place over stock poses.`,
      typography: `${brand.brandKit?.fontHeading || "Display"} for headlines; ${brand.brandKit?.fontBody || "Sans"} for body. Generous line-height.`,
      colorUse: `Primary ${brand.brandKit?.primaryColor || "#0F3D3E"}, accent ${brand.brandKit?.accentColor || "#D97706"} for CTAs and emphasis only.`,
      avoid: "Neon gradients, cluttered stickers, low-contrast text on busy photos",
    },
    provenHooks: [],
    rawDocument: [
      `# ${brand.businessName} — Brand DNA`,
      "",
      `USP: ${brand.usp || "TBD"}`,
      `Niche: ${niche}`,
      `Voice: ${voiceTone}`,
      "",
      "## Pillars",
      ...pillars.map((p) => `- ${p.name} (${p.weight}%): ${p.description}`),
      "",
      "## Do",
      ...[`Lead with hooks`, `Stay specific to ${niche}`, `Human CTAs`].map((d) => `- ${d}`),
      "",
      "## Don't",
      ...["Copy competitors", "Hype without proof", "Hard-sell every time"].map((d) => `- ${d}`),
    ].join("\n"),
  };

  return brandDnaSchema.parse(dna);
}
