export type TTSRequest = {
  text: string;
  language: "ur-PK" | "en-US";
  voice?: string;
  idempotencyKey: string;
};

export type TTSResult = {
  audioUrl: string;
  characters: number;
  durationMs: number;
};

export interface TTSProvider {
  readonly name: string;
  synthesize(request: TTSRequest): Promise<TTSResult>;
}
