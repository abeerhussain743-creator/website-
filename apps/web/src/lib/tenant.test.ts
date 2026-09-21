import { describe, expect, it } from "vitest";
import { createTenantClient, TenantScopeError } from "@maxtrone/db";

/**
 * Lightweight compile/import smoke for the web app's tenant dependency.
 * Full DB isolation lives in @maxtrone/db tests.
 */
describe("web tenant wiring", () => {
  it("exports tenant client helpers", () => {
    expect(typeof createTenantClient).toBe("function");
    expect(TenantScopeError.name).toBe("TenantScopeError");
  });
});
