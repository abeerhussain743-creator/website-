import type {
  MessagingProvider,
  OutboundMediaMessage,
  OutboundTextMessage,
  SendResult,
} from "./types.js";

export type MockMessage = OutboundTextMessage | OutboundMediaMessage;

export class MockMessagingProvider implements MessagingProvider {
  readonly name = "mock";
  readonly sent: MockMessage[] = [];

  async sendText(message: OutboundTextMessage): Promise<SendResult> {
    this.sent.push(message);
    return {
      providerMessageId: `mock_msg_${this.sent.length}`,
      status: "sent",
    };
  }

  async sendMedia(message: OutboundMediaMessage): Promise<SendResult> {
    this.sent.push(message);
    return {
      providerMessageId: `mock_media_${this.sent.length}`,
      status: "sent",
    };
  }

  verifyWebhookSignature(_rawBody: string, _signatureHeader: string | null): boolean {
    return true;
  }

  clear() {
    this.sent.length = 0;
  }
}
