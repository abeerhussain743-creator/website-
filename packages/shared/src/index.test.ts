import { describe, expect, it } from "vitest";
import { JOB_STATUSES, PRODUCT_SHOPIFY_FIELDS } from "./index.js";

describe("shared constants", () => {
  it("includes terminal job statuses", () => {
    expect(JOB_STATUSES).toContain("COMPLETED");
    expect(JOB_STATUSES).toContain("FAILED");
  });

  it("requires handle and title for products", () => {
    const required = PRODUCT_SHOPIFY_FIELDS.filter((f) => f.required).map(
      (f) => f.key,
    );
    expect(required).toEqual(["product.handle", "product.title"]);
  });
});
