import { LocalLlmAdapter } from "./local.js";
import type { LlmAdapter, LlmGenerateResult } from "./llm.js";
import type { GeneratePostInput, BrandContext } from "../schemas.js";
import type { WebsiteSignals } from "../website-ingest.js";
import type { BrandDnaDocument } from "../brand-dna.js";

/**
 * OpenAI adapter — attempts chat completions with JSON mode.
 * Falls back to local creative engine when the call fails.
 */
export class OpenAiLlmAdapter implements LlmAdapter {
  readonly name = "openai";
  private local = new LocalLlmAdapter();

  async generatePost(input: GeneratePostInput): Promise<LlmGenerateResult> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return this.local.generatePost(input);

    try {
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "You generate premium social posts as JSON only.",
            },
            {
              role: "user",
              content: JSON.stringify(input),
            },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) return this.local.generatePost(input);
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const text = data.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(text);
      const fallback = await this.local.generatePost(input);
      return {
        post: {
          ...fallback.post,
          ...parsed,
          provider: `openai:${model}`,
          qualityScores: parsed.qualityScores ?? fallback.post.qualityScores,
          qualityPassed:
            parsed.qualityPassed ?? fallback.post.qualityPassed,
        },
        cost: {
          provider: "openai",
          model,
          inputTokens: data.usage?.prompt_tokens,
          outputTokens: data.usage?.completion_tokens,
        },
      };
    } catch {
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
  }): Promise<{ dna: BrandDnaDocument; cost: import("./llm.js").LlmCost }> {
    const local = await this.local.generateBrandDna!(input);
    return {
      dna: local.dna,
      cost: { ...local.cost, provider: "openai+local", model: "gpt+local-brand-dna" },
    };
  }
}
