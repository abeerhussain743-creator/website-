import { LocalLlmAdapter } from "./local.js";
import type { LlmAdapter, LlmGenerateResult } from "./llm.js";
import type { GeneratePostInput, BrandContext } from "../schemas.js";
import type { WebsiteSignals } from "../website-ingest.js";
import type { BrandDnaDocument } from "../brand-dna.js";

/**
 * Anthropic adapter — attempts Messages API with structured JSON.
 * Falls back to local creative engine when the call fails or response is invalid.
 */
export class AnthropicLlmAdapter implements LlmAdapter {
  readonly name = "anthropic";
  private local = new LocalLlmAdapter();

  async generatePost(input: GeneratePostInput): Promise<LlmGenerateResult> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return this.local.generatePost(input);

    try {
      const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: `Return ONLY JSON matching our GeneratedPost schema for this brief:\n${JSON.stringify(input)}`,
            },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) return this.local.generatePost(input);
      const data = (await res.json()) as {
        content?: Array<{ text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const text = data.content?.[0]?.text ?? "";
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart < 0 || jsonEnd < 0) return this.local.generatePost(input);
      const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      const fallback = await this.local.generatePost(input);
      return {
        post: {
          ...fallback.post,
          ...parsed,
          provider: `anthropic:${model}`,
          qualityScores: parsed.qualityScores ?? fallback.post.qualityScores,
          qualityPassed:
            parsed.qualityPassed ?? fallback.post.qualityPassed,
        },
        cost: {
          provider: "anthropic",
          model,
          inputTokens: data.usage?.input_tokens,
          outputTokens: data.usage?.output_tokens,
          costUsd: undefined,
        },
      };
    } catch {
      const local = await this.local.generatePost(input);
      return {
        post: { ...local.post, provider: "anthropic+local-fallback" },
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
      cost: { ...local.cost, provider: "anthropic+local", model: "claude+local-brand-dna" },
    };
  }
}
