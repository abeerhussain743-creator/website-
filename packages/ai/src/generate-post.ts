import {
  type GeneratePostInput,
  type GeneratedPost,
  generatePostInputSchema,
} from "./schemas.js";
import { getLlmAdapter } from "./adapters/llm.js";
export { generatePostLocal } from "./local-engine.js";

/**
 * Generate a structured post via the configured LLM adapter
 * (Anthropic → OpenAI → local creative engine).
 */
export async function generatePost(raw: GeneratePostInput): Promise<GeneratedPost> {
  const input = generatePostInputSchema.parse(raw);
  const adapter = await getLlmAdapter();
  const { post, cost } = await adapter.generatePost(input);
  // Attach cost metadata on provider string for callers that log AICallLog
  if (cost.inputTokens || cost.outputTokens) {
    return {
      ...post,
      provider: `${post.provider}|in:${cost.inputTokens ?? 0}|out:${cost.outputTokens ?? 0}`,
    };
  }
  return post;
}
