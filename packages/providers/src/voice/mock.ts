import type {
  VoiceCallProvider,
  VoiceCallRequest,
  VoiceCallResult,
} from "./types.js";

export class MockVoiceCallProvider implements VoiceCallProvider {
  readonly name = "mock";
  readonly calls: VoiceCallRequest[] = [];

  async startCall(request: VoiceCallRequest): Promise<VoiceCallResult> {
    this.calls.push(request);
    return {
      callId: `mock_call_${this.calls.length}`,
      outcome: "answered",
      transcript: "Parent said they will pay tomorrow.",
      promisedDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      recordingUrl: `mock://recording/${request.idempotencyKey}.mp3`,
    };
  }

  verifyWebhookSignature(): boolean {
    return true;
  }
}
