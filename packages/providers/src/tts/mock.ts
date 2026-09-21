import type { TTSProvider, TTSRequest, TTSResult } from "./types.js";

export class MockTTSProvider implements TTSProvider {
  readonly name = "mock";
  readonly calls: TTSRequest[] = [];

  async synthesize(request: TTSRequest): Promise<TTSResult> {
    this.calls.push(request);
    return {
      audioUrl: `mock://tts/${request.idempotencyKey}.ogg`,
      characters: request.text.length,
      durationMs: Math.max(1000, request.text.length * 40),
    };
  }
}
