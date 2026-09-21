import type {
  CreatePaymentLinkRequest,
  PaymentCallback,
  PaymentLinkResult,
  PaymentProvider,
} from "./types.js";

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  readonly links: CreatePaymentLinkRequest[] = [];
  private seenCallbacks = new Set<string>();

  async createPaymentLink(
    request: CreatePaymentLinkRequest,
  ): Promise<PaymentLinkResult> {
    this.links.push(request);
    const id = `mock_pay_${request.idempotencyKey}`;
    return {
      providerPaymentId: id,
      checkoutUrl: `https://pay.mock.local/checkout/${id}`,
    };
  }

  parseCallback(payload: unknown): PaymentCallback {
    const body = payload as {
      providerPaymentId?: string;
      amountPaisa?: number;
      status?: PaymentCallback["status"];
    };
    const providerPaymentId = body.providerPaymentId ?? "unknown";
    return {
      providerPaymentId,
      status: body.status ?? "succeeded",
      amountPaisa: body.amountPaisa ?? 0,
      raw: payload,
    };
  }

  /** Helper for tests: same callback twice should be detectable by idempotency key. */
  markProcessed(providerPaymentId: string): boolean {
    if (this.seenCallbacks.has(providerPaymentId)) return false;
    this.seenCallbacks.add(providerPaymentId);
    return true;
  }

  verifyWebhookSignature(): boolean {
    return true;
  }
}
