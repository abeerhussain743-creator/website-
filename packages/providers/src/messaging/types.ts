export type MessageLanguage = "UR" | "ROMAN_UR" | "EN";

export type OutboundTextMessage = {
  to: string;
  body: string;
  language?: MessageLanguage;
  idempotencyKey: string;
  templateName?: string;
  templateParams?: Record<string, string>;
};

export type OutboundMediaMessage = {
  to: string;
  mediaUrl: string;
  caption?: string;
  idempotencyKey: string;
};

export type SendResult = {
  providerMessageId: string;
  status: "queued" | "sent" | "failed";
  raw?: unknown;
};

export interface MessagingProvider {
  readonly name: string;
  sendText(message: OutboundTextMessage): Promise<SendResult>;
  sendMedia(message: OutboundMediaMessage): Promise<SendResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
}
