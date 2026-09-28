import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto.js";
import { slugify } from "./slug.js";
import { canEditContent, roleAtLeast } from "./roles.js";

describe("slugify", () => {
  it("normalizes names", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });
});

describe("crypto", () => {
  it("round-trips secrets", () => {
    const key = Buffer.alloc(32, 7).toString("base64");
    const enc = encryptSecret("token-value", key);
    expect(decryptSecret(enc, key)).toBe("token-value");
  });
});

describe("roles", () => {
  it("ranks roles", () => {
    expect(roleAtLeast("ADMIN", "EDITOR")).toBe(true);
    expect(canEditContent("CLIENT_APPROVER")).toBe(false);
  });
});
