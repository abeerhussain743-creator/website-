export type VoiceCallRequest = {
  to: string;
  script: string;
  language: "ur-PK" | "en-US";
  idempotencyKey: string;
  metadata?: Record<string, string>;
};

export type VoiceCallOutcome =
  | "answered"
  | "promised_date"
  | "dispute"
  | "wrong_number"
  | "callback_requested"
  | "no_answer";

export type VoiceCallResult = {
  callId: string;
  outcome: VoiceCallOutcome;
  promisedDate?: string;
  transcript?: string;
  recordingUrl?: string;
};

export interface VoiceCallProvider {
  readonly name: string;
  startCall(request: VoiceCallRequest): Promise<VoiceCallResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
}
