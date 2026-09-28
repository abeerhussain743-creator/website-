import type { BrandContext, QualityScores } from "./schemas.js";

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function scorePostCopy(input: {
  brand: BrandContext;
  hook: string;
  caption: string;
  cta: string;
  hashtags: string[];
  platform: string;
}): QualityScores {
  const { brand, hook, caption, cta, hashtags, platform } = input;
  const lowerCaption = caption.toLowerCase();
  const avoidHits = (brand.wordsToAvoid ?? []).filter((w) =>
    lowerCaption.includes(w.toLowerCase()),
  ).length;
  const useHits = (brand.wordsToUse ?? []).filter((w) =>
    lowerCaption.includes(w.toLowerCase()),
  ).length;

  const hookStrength = clamp(
    55 +
      (hook.includes("?") ? 8 : 0) +
      (/\d/.test(hook) ? 10 : 0) +
      (hook.length >= 18 && hook.length <= 90 ? 12 : -8) +
      (hook.split(" ").length <= 14 ? 6 : -4),
  );

  const brandVoice = clamp(
    70 + useHits * 6 - avoidHits * 18 + (brand.usp ? 5 : 0),
  );

  const clarity = clamp(
    60 +
      (caption.includes("\n") ? 8 : 0) +
      (caption.length > 80 && caption.length < 1400 ? 12 : -10) +
      (caption.split(/[.!?]/).length >= 2 ? 6 : 0),
  );

  const value = clamp(
    58 +
      (/(how|why|tip|guide|secret|mistake|framework|step)/i.test(caption)
        ? 15
        : 0) +
      (brand.audience?.pains ? 8 : 0),
  );

  const originality = clamp(
    72 -
      (/(click here|synergy|game changer|hustle harder)/i.test(caption)
        ? 25
        : 0) +
      (brand.niche ? 6 : 0),
  );

  const platformFit = clamp(
    platform === "LINKEDIN"
      ? caption.length > 200
        ? 82
        : 60
      : platform === "X"
        ? caption.length <= 260
          ? 88
          : 45
        : hashtags.length >= 3 && hashtags.length <= 15
          ? 85
          : 65,
  );

  const ctaScore = clamp(
    cta.length > 8
      ? 78 + (/(comment|save|share|dm|link|follow|try)/i.test(cta) ? 12 : 0)
      : 40,
  );

  const overall = clamp(
    hookStrength * 0.2 +
      brandVoice * 0.18 +
      clarity * 0.14 +
      value * 0.16 +
      originality * 0.12 +
      platformFit * 0.1 +
      ctaScore * 0.1,
  );

  return {
    hookStrength,
    brandVoice,
    clarity,
    value,
    originality,
    platformFit,
    cta: ctaScore,
    overall,
  };
}

export const QUALITY_THRESHOLD = 72;
