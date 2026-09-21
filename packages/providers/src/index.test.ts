import { describe, expect, it } from "vitest";
import { createProviders, MockPaymentProvider } from "./index";

describe("providers", () => {
  it("runs fully on mocks with zero external accounts", async () => {
    const p = createProviders({
      MESSAGING_PROVIDER: "mock",
      AI_PROVIDER: "mock",
    });

    const msg = await p.messaging.sendText({
      to: "+923001234567",
      body: "Assalam o alaikum",
      idempotencyKey: "k1",
    });
    expect(msg.status).toBe("sent");

    const ai = await p.ai.complete({
      messages: [{ role: "user", content: "Fee kitni hai?" }],
      idempotencyKey: "k2",
    });
    expect(ai.text).toContain("Mock reply");

    const tts = await p.tts.synthesize({
      text: "Fee reminder",
      language: "ur-PK",
      idempotencyKey: "k3",
    });
    expect(tts.audioUrl).toContain("mock://");

    const call = await p.voice.startCall({
      to: "+923001234567",
      script: "Fee reminder call",
      language: "ur-PK",
      idempotencyKey: "k4",
    });
    expect(call.outcome).toBe("answered");

    const link = await p.payment.createPaymentLink({
      amountPaisa: 500000,
      currency: "PKR",
      channel: "JAZZCASH",
      invoiceId: "inv_1",
      customerPhone: "+923001234567",
      description: "September fee",
      idempotencyKey: "pay_1",
      returnUrl: "http://localhost:3000/pay/done",
    });
    expect(link.checkoutUrl).toContain("mock");
  });

  it("payment callback idempotency helper rejects duplicates", () => {
    const payment = new MockPaymentProvider();
    expect(payment.markProcessed("pay_1")).toBe(true);
    expect(payment.markProcessed("pay_1")).toBe(false);
  });
});
