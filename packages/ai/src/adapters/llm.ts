import type { GeneratePostInput, GeneratedPost } from "../schemas.js";
import type { BrandContext } from "../schemas.js";
import type { BrandDnaDocument } from "../brand-dna.js";
import type { WebsiteSignals } from "../website-ingest.js";

export type LlmCost = {
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  model: string;
  provider: string;
};

export type LlmGenerateResult = {
  post: GeneratedPost;
  cost: LlmCost;
};

export interface LlmAdapter {
  readonly name: string;
  generatePost(input: GeneratePostInput): Promise<LlmGenerateResult>;
  generateBrandDna?(input: {
    brand: BrandContext;
    website?: WebsiteSignals;
  }): Promise<{ dna: BrandDnaDocument; cost: LlmCost }>;
}

export async function getLlmAdapter(): Promise<LlmAdapter> {
  if (process.env.ANTHROPIC_API_KEY) {
    const { AnthropicLlmAdapter } = await import("./anthropic.js");
    return new AnthropicLlmAdapter();
  }
  if (process.env.OPENAI_API_KEY) {
    const { OpenAiLlmAdapter } = await import("./openai.js");
    return new OpenAiLlmAdapter();
  }
  const { LocalLlmAdapter } = await import("./local.js");
  return new LocalLlmAdapter();
}
