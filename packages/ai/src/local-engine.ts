import {
  type BrandContext,
  type GeneratePostInput,
  type GeneratedPost,
  type hookOptionSchema,
  generatePostInputSchema,
  generatedPostSchema,
} from "./schemas.js";
import { QUALITY_THRESHOLD, scorePostCopy } from "./quality.js";
import type { z } from "zod";

type HookOption = z.infer<typeof hookOptionSchema>;

const TEMPLATE_FAMILIES = [
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
] as const;

function pickFamily(
  preferred: GeneratePostInput["templateFamily"],
  objective: string,
  format: string,
): (typeof TEMPLATE_FAMILIES)[number] {
  if (preferred) return preferred;
  if (format === "CAROUSEL") return objective === "awareness" ? "listicle" : "tip";
  if (objective === "sales") return "bold";
  if (objective === "leads") return "stat";
  if (objective === "community") return "playful";
  return "editorial";
}

function tonePhrase(brand: BrandContext): string {
  const t = brand.toneSliders ?? {
    formalCasual: 50,
    seriousPlayful: 50,
    boldSubtle: 50,
  };
  const casual = t.formalCasual >= 60;
  const playful = t.seriousPlayful >= 60;
  const bold = t.boldSubtle <= 40;
  if (bold && playful) return "punchy and warm";
  if (casual && playful) return "friendly and conversational";
  if (!casual && !playful) return "composed and credible";
  return "clear and human";
}

function seedTopic(input: GeneratePostInput): string {
  if (input.topic?.trim()) return input.topic.trim();
  const niche = input.brand.niche || input.brand.industry || "your craft";
  const usp = input.brand.usp ? ` — ${input.brand.usp}` : "";
  const pillars = [
    `A practical tip from ${niche}`,
    `What most people get wrong about ${niche}`,
    `A behind-the-scenes look at ${input.brand.businessName}`,
    `Why ${niche} customers care about consistency`,
    `A small ritual that compounds in ${niche}${usp}`,
  ];
  const idx =
    Math.abs(
      [...(input.brand.businessName + (input.objective ?? ""))].reduce(
        (a, c) => a + c.charCodeAt(0),
        0,
      ),
    ) % pillars.length;
  return pillars[idx]!;
}

function buildHooks(brand: BrandContext, topic: string): HookOption[] {
  const name = brand.businessName;
  const niche = brand.niche || brand.industry || "this space";
  const pain = brand.audience?.pains?.split(/[.,]/)[0]?.trim();
  const candidates: HookOption[] = [
    {
      text: `Stop treating ${niche} like a trend. Treat it like a craft.`,
      score: 86,
      type: "contrarian",
    },
    {
      text: pain
        ? `${pain}? Here's the quieter fix ${name} swears by.`
        : `The quiet habit that makes ${niche} feel effortless.`,
      score: 88,
      type: "pain",
    },
    {
      text: `3 signals your ${niche} content is working (before the follower count moves).`,
      score: 84,
      type: "list",
    },
    {
      text: `Most ${niche} brands talk louder. The best ones talk clearer.`,
      score: 87,
      type: "bold_claim",
    },
    {
      text: `What if your next post didn't sell — it earned a save?`,
      score: 83,
      type: "curiosity",
    },
  ];
  if (topic) {
    candidates.unshift({
      text: topic.length > 90 ? `${topic.slice(0, 87)}…` : topic,
      score: 90,
      type: "topic",
    });
  }
  return candidates.slice(0, 5).sort((a, b) => b.score - a.score);
}

function hashtagsFor(brand: BrandContext, platform: string): string[] {
  const niche = (brand.niche || brand.industry || "brand")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  const name = brand.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const base = [
    `#${niche}`,
    `#${name}`,
    "#contentstrategy",
    "#brandvoice",
    "#creativedirection",
    "#socialmediatips",
    "#designmatters",
  ];
  if (platform === "LINKEDIN") return base.slice(0, 5);
  if (platform === "X") return base.slice(0, 3);
  return base.slice(0, 10);
}

function buildCaption(
  brand: BrandContext,
  hook: string,
  topic: string,
  objective: string,
): { caption: string; cta: string; headline: string; subhead: string } {
  const voice = tonePhrase(brand);
  const words = (brand.wordsToUse ?? []).slice(0, 3);
  const wordLine = words.length
    ? `We lean on words like ${words.map((w) => `“${w}”`).join(", ")}.`
    : "";
  const desire =
    brand.audience?.desires?.split(/[.,]/)[0]?.trim() ||
    "something that feels considered, not loud";
  const usp = brand.usp || `a sharper point of view on ${brand.niche || "the craft"}`;

  const headline =
    topic.length > 64 ? topic.slice(0, 61).trimEnd() + "…" : topic;
  const subhead = `${brand.businessName} · ${voice}`;

  const ctaMap: Record<string, string> = {
    awareness: "Save this for the next time you plan content.",
    engagement: "Comment the word RITUAL if you want the full checklist.",
    leads: "DM “GUIDE” and we’ll send the one-pager.",
    sales: "Tap the link in bio while this drop is live.",
    community: "Tag someone who needs this reminder today.",
  };
  const cta = ctaMap[objective] ?? ctaMap.engagement!;

  const caption = [
    hook,
    "",
    `At ${brand.businessName}, we design posts to earn attention — then repay it with clarity.`,
    "",
    `Today's angle: ${topic}.`,
    `The promise: ${usp}.`,
    `The feeling we want: ${desire}.`,
    wordLine,
    "",
    "Framework we use:",
    "1) Hook hard in the first line",
    "2) Deliver one concrete idea",
    "3) Close with a human CTA — not a hard sell",
    "",
    cta,
  ]
    .filter((line) => line !== undefined && line !== "")
    .join("\n");

  return { caption, cta, headline, subhead };
}

function buildSlides(topic: string, brand: BrandContext) {
  return [
    {
      title: topic,
      body: `${brand.businessName} creative direction`,
      emphasis: "01",
    },
    {
      title: "Hook first",
      body: "Lead with tension, curiosity, or a sharp claim — never a soft intro.",
      emphasis: "02",
    },
    {
      title: "One idea",
      body: "Each frame earns its place. Cut anything that doesn't teach or move.",
      emphasis: "03",
    },
    {
      title: "Brand proof",
      body: brand.usp || "Stay unmistakable. If it could be any brand, rewrite it.",
      emphasis: "04",
    },
    {
      title: "Human CTA",
      body: "Ask for a save, a reply, or a ritual — not a generic “link in bio” every time.",
      emphasis: "05",
    },
  ];
}

function visualDirection(
  family: string,
  brand: BrandContext,
): string {
  const colors = brand.brandKit;
  return `${family} layout using ${colors?.primaryColor ?? "#0F3D3E"} / ${
    colors?.accentColor ?? "#D97706"
  }, generous margins, high contrast type, product-atmosphere photography cues for ${
    brand.niche || brand.industry || "the brand"
  }.`;
}

/**
 * Premium local creative engine — produces strong structured posts without
 * external APIs. Used as primary when no LLM key is configured, and as
 * fallback when providers fail.
 */
export function generatePostLocal(raw: GeneratePostInput): GeneratedPost {
  const input = generatePostInputSchema.parse(raw);
  const topic = seedTopic(input);
  const family = pickFamily(
    input.templateFamily,
    input.objective,
    input.format,
  );
  const hooks = buildHooks(input.brand, topic);
  const selected = hooks[0]!;
  const { caption, cta, headline, subhead } = buildCaption(
    input.brand,
    selected.text,
    topic,
    input.objective,
  );
  const tags = hashtagsFor(input.brand, input.platform);
  let qualityScores = scorePostCopy({
    brand: input.brand,
    hook: selected.text,
    caption,
    cta,
    hashtags: tags,
    platform: input.platform,
  });

  // One rewrite loop if under threshold
  let finalCaption = caption;
  let finalHook = selected.text;
  if (qualityScores.overall < QUALITY_THRESHOLD) {
    finalHook = `${selected.text.replace(/\.$/, "")} — made for saves.`;
    finalCaption = `${finalHook}\n\n${caption.split("\n").slice(2).join("\n")}`;
    qualityScores = scorePostCopy({
      brand: input.brand,
      hook: finalHook,
      caption: finalCaption,
      cta,
      hashtags: tags,
      platform: input.platform,
    });
  }

  const post = {
    hooks,
    selectedHook: finalHook,
    headline,
    subhead,
    caption: finalCaption,
    hashtags: tags,
    cta,
    altText: `${headline} — branded ${input.format.toLowerCase()} for ${input.brand.businessName}`,
    slides:
      input.format === "CAROUSEL" ? buildSlides(topic, input.brand) : undefined,
    reelScript:
      input.format === "REEL"
        ? {
            hook2s: finalHook,
            scenes: [
              "Open on branded color field + hook text",
              "Cut to product/atmosphere detail",
              "Show tip cards on-screen",
              "End on logo + CTA",
            ],
            onScreenText: [finalHook, headline, cta],
            voiceover: finalCaption.split("\n").filter(Boolean).slice(0, 4).join(" "),
            broll: ["hands at work", "texture details", "customer smile", "logo lockup"],
          }
        : undefined,
    templateFamily: family,
    visualDirection: visualDirection(family, input.brand),
    qualityScores,
    qualityPassed: qualityScores.overall >= QUALITY_THRESHOLD,
    provider: "local-creative-engine",
  };

  return generatedPostSchema.parse(post);
}
