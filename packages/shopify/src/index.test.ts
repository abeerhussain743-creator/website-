import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  encryptToken,
  decryptToken,
  normalizeShopDomain,
  verifyShopifyWebhookHmac,
} from "./index.js";

describe("normalizeShopDomain", () => {
  it("accepts valid myshopify domains", () => {
    expect(normalizeShopDomain("https://Demo-Shop.myshopify.com/")).toBe(
      "demo-shop.myshopify.com",
    );
  });

  it("rejects invalid domains", () => {
    expect(() => normalizeShopDomain("evil.com")).toThrow(/valid/);
  });
});

describe("token encryption", () => {
  it("round-trips", () => {
    process.env.TOKEN_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const encrypted = encryptToken("shpat_test_token");
    expect(decryptToken(encrypted)).toBe("shpat_test_token");
  });
});

describe("webhook hmac", () => {
  it("verifies matching signatures", () => {
    const body = Buffer.from('{"id":1}');
    const secret = "hmac-secret";
    const digest = createHmac("sha256", secret).update(body).digest("base64");
    expect(verifyShopifyWebhookHmac(body, digest, secret)).toBe(true);
    expect(verifyShopifyWebhookHmac(body, "nope", secret)).toBe(false);
  });
});
