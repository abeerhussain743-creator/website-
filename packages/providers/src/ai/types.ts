export type AIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AICompletionRequest = {
  messages: AIChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  idempotencyKey: string;
};

export type AICompletionResult = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
};

export interface AIProvider {
  readonly name: string;
  complete(request: AICompletionRequest): Promise<AICompletionResult>;
}
