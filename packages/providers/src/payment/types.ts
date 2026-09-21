export type PaymentChannel =
  | "JAZZCASH"
  | "EASYPAISA"
  | "BANK_TRANSFER"
  | "CASH"
  | "CHEQUE";

export type CreatePaymentLinkRequest = {
  amountPaisa: number;
  currency: "PKR";
  channel: PaymentChannel;
  invoiceId: string;
  customerPhone: string;
  description: string;
  idempotencyKey: string;
  returnUrl: string;
};

export type PaymentLinkResult = {
  providerPaymentId: string;
  checkoutUrl: string;
};

export type PaymentCallback = {
  providerPaymentId: string;
  status: "succeeded" | "failed" | "pending";
  amountPaisa: number;
  raw: unknown;
};

export interface PaymentProvider {
  readonly name: string;
  createPaymentLink(request: CreatePaymentLinkRequest): Promise<PaymentLinkResult>;
  parseCallback(payload: unknown): PaymentCallback;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
}
