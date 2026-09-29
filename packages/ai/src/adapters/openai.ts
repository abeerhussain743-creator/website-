import { LocalLlmAdapter } from "./local.js";
import type { LlmAdapter, LlmGenerateResult, LlmCost } from "./llm.js";
import type { GeneratePostInput, BrandContext, GeneratedPost } from "../schemas.js";
import { generatedPostSchema } from "../schemas.js";
import type { WebsiteSignals } from "../website-ingest.js";
import type { BrandDnaDocument } from "../brand-dna.js";
import { brandDnaSchema } from "../brand-dna.js";
import { QUALITY_THRESHOLD, scorePostCopy } from "../quality.js";

/**
 * OpenAI adapter — chat completions with JSON mode, Zod-validated.
 * Falls back to local creative engine when the call fails.
 */
export class OpenAiLlmAdapter implements LlmAdapter {
  readonly name = "openai";
  private local = new LocalLlmAdapter();

  async generatePost(input: GeneratePostInput): Promise<LlmGenerateResult> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return this.local.generatePost(input);

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    try {
      const system = `You are PostPilot, a premium social media creative director.
Return ONLY a JSON object matching this shape:
{
  "hooks": [{"text": string, "score": 0-100, "type": string}] (3-5 items),
  "selectedHook": string,
  "headline": string,
  "subhead": string,
  "caption": string,
  "hashtags": string[],
  "cta": string,
  "altText": string,
  "slides": [{"title": string, "body": string, "emphasis": string}] (only for CAROUSEL, 4-6 slides),
  "reelScript": {"hook2s": string, "scenes": string[], "onScreenText": string[], "voiceover": string, "broll": string[]} (only for REEL),
  "templateFamily": one of minimal|bold|editorial|corporate|playful|luxury|quote|stat|listicle|tip,
  "visualDirection": string,
  "qualityScores": {"hookStrength":n,"brandVoice":n,"clarity":n,"value":n,"originality":n,"platformFit":n,"cta":n,"overall":n},
  "qualityPassed": boolean,
  "provider": "openai"
}
Rules: brand voice from input; no banned words; hook under 90 chars; caption platform-aware; originality over hype.
If feedback is present, revise to address it.`;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: JSON.stringify(input) },
          ],
        }),
        signal: AbortSignal.timeout(45_000),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`[openai] generatePost HTTP ${res.status}: ${errText.slice(0, 200)}`);
        return this.local.generatePost(input);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const text = data.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(text) as Partial<GeneratedPost>;
      const fallback = await this.local.generatePost(input);

      const merged = {
        ...fallback.post,
        ...parsed,
        hooks: parsed.hooks?.length ? parsed.hooks : fallback.post.hooks,
        selectedHook: parsed.selectedHook || fallback.post.selectedHook,
        caption: parsed.caption || fallback.post.caption,
        hashtags: parsed.hashtags?.length ? parsed.hashtags : fallback.post.hashtags,
        cta: parsed.cta || fallback.post.cta,
        templateFamily: parsed.templateFamily || fallback.post.templateFamily,
        provider: `openai:${model}`,
      };

      const qualityScores = scorePostCopy({
        brand: input.brand,
        hook: merged.selectedHook,
        caption: merged.caption,
        cta: merged.cta,
        hashtags: merged.hashtags,
        platform: input.platform,
      });
      // Prefer model scores if present and sane, else recompute
      const scores =
        parsed.qualityScores && typeof parsed.qualityScores.overall === "number"
          ? { ...qualityScores, ...parsed.qualityScores, overall: parsed.qualityScores.overall }
          : qualityScores;

      const post = generatedPostSchema.parse({
        ...merged,
        qualityScores: scores,
        qualityPassed: scores.overall >= QUALITY_THRESHOLD,
        provider: `openai:${model}`,
      });

      const cost: LlmCost = {
        provider: "openai",
        model,
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
      };
      return { post, cost };
    } catch (err) {
      console.error("[openai] generatePost failed", err);
      const local = await this.local.generatePost(input);
      return {
        post: { ...local.post, provider: "openai+local-fallback" },
        cost: local.cost,
      };
    }
  }

  async generateBrandDna(input: {
    brand: BrandContext;
    website?: WebsiteSignals;
  }): Promise<{ dna: BrandDnaDocument; cost: LlmCost }> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return this.local.generateBrandDna!(input);

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `Create a Brand DNA JSON with keys: voiceRules{tone,sentenceLength,perspective,emojiPolicy}, contentPillars[{name,weight,description}], audiencePersona{name,summary,pains[],desires[]}, doList[], dontList[], visualStyleGuide{photography,typography,colorUse,avoid}, provenHooks[], rawDocument (markdown). Use website signals when present.`,
            },
            {
              role: "user",
              content: JSON.stringify({
                brand: input.brand,
                website: input.website,
              }),
            },
          ],
        }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) return this.local.generateBrandDna!(input);
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
      const local = await this.local.generateBrandDna!(input);
      const dna = brandDnaSchema.parse({ ...local.dna, ...parsed });
      return {
        dna,
        cost: {
          provider: "openai",
          model,
          inputTokens: data.usage?.prompt_tokens,
          outputTokens: data.usage?.completion_tokens,
        },
      };
    } catch (err) {
      console.error("[openai] brandDna failed", err);
      return this.local.generateBrandDna!(input);
    }
  }
}
