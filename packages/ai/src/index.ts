/**
 * Phase 2: LLM + image adapters with Zod-validated structured outputs.
 * Interface skeleton only — no provider calls in Phase 1.
 */
export interface LlmAdapter {
  readonly provider: "anthropic" | "openai";
  completeStructured<T>(input: {
    system: string;
    user: string;
    schemaName: string;
  }): Promise<T>;
}

export function assertPhase2(): never {
  throw new Error("@postpilot/ai is not implemented until Phase 2");
}
