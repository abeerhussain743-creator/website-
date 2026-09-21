import type { AICompletionRequest, AICompletionResult, AIProvider } from "./types";

export class MockAIProvider implements AIProvider {
  readonly name = "mock";
  readonly calls: AICompletionRequest[] = [];

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    this.calls.push(request);
    const lastUser = [...request.messages].reverse().find((m) => m.role === "user");
    return {
      text: `Mock reply to: ${lastUser?.content?.slice(0, 120) ?? ""}`,
      model: request.model ?? "mock-model",
      inputTokens: 10,
      outputTokens: 20,
      latencyMs: 5,
    };
  }
}
