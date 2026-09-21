import { describe, expect, it } from "vitest";
import { formatPkr, pkrToPaisa, paisa } from "./money.js";
import { normalizePakistanPhone } from "./phone.js";
import { terminologyForType, t } from "./terminology.js";
import { hasFeature, resolveEntitlements, withinLimit } from "./entitlements.js";
import { hasPermission, DEFAULT_PERMISSIONS } from "./permissions.js";
import {
  allocatePayment,
  applyDiscount,
  applySiblingDiscount,
  calculateLateFee,
  buildEqualInstallments,
} from "./fees/index.js";
import { formatDate, isWithinQuietHours } from "./dates.js";

describe("money", () => {
  it("formats Pakistani grouping", () => {
    expect(formatPkr(pkrToPaisa(185000))).toBe("PKR 1,85,000");
    expect(formatPkr(pkrToPaisa(1000))).toBe("PKR 1,000");
    expect(formatPkr(paisa(1050))).toBe("PKR 10.50");
  });

  it("rejects float paisa", () => {
    expect(() => paisa(1.5)).toThrow();
  });
});

describe("phone", () => {
  it("normalizes local formats to E.164", () => {
    expect(normalizePakistanPhone("0300-1234567")).toBe("+923001234567");
    expect(normalizePakistanPhone("03001234567")).toBe("+923001234567");
    expect(normalizePakistanPhone("+923001234567")).toBe("+923001234567");
    expect(normalizePakistanPhone("923001234567")).toBe("+923001234567");
  });
});

describe("terminology", () => {
  it("returns presets per institution type", () => {
    expect(terminologyForType("SCHOOL").group).toBe("Class");
    expect(terminologyForType("COACHING_ACADEMY").group).toBe("Batch");
    expect(terminologyForType("TRAINING_CENTER").learner).toBe("Trainee");
    expect(t(terminologyForType("SCHOOL"), "group", { plural: true })).toBe(
      "Classes",
    );
  });
});

describe("entitlements", () => {
  it("applies overrides over plan defaults", () => {
    const map = resolveEntitlements(
      [{ feature: "ai_tutor", enabled: false, limit: null }],
      [{ feature: "ai_tutor", enabled: true, limit: 50 }],
    );
    expect(hasFeature(map, "ai_tutor")).toBe(true);
    expect(withinLimit(map, "ai_tutor_seats", 10)).toBe(false);
    const withSeats = resolveEntitlements(
      [{ feature: "ai_tutor_seats", enabled: true, limit: 50 }],
      [],
    );
    expect(withinLimit(withSeats, "ai_tutor_seats", 10)).toBe(true);
    expect(withinLimit(withSeats, "ai_tutor_seats", 50)).toBe(false);
  });
});

describe("permissions", () => {
  it("owner has fees.write", () => {
    expect(hasPermission(DEFAULT_PERMISSIONS.OWNER, "fees.write")).toBe(true);
    expect(hasPermission(DEFAULT_PERMISSIONS.TEACHER, "fees.write")).toBe(false);
  });
});

describe("fees engine", () => {
  it("applies percent and fixed discounts", () => {
    expect(applyDiscount(100_000, { kind: "PERCENT", value: 10 })).toBe(90_000);
    expect(applyDiscount(100_000, { kind: "FIXED", value: 5_000 })).toBe(95_000);
  });

  it("applies sibling discounts with a cap", () => {
    expect(applySiblingDiscount(100_000, 2, 10, 30)).toBe(80_000);
    expect(applySiblingDiscount(100_000, 5, 10, 30)).toBe(70_000);
  });

  it("calculates late fees", () => {
    expect(
      calculateLateFee(50_000, 3, { kind: "PER_DAY", amountPaisa: 1000, capPaisa: 5000 }),
    ).toBe(3000);
    expect(
      calculateLateFee(50_000, 10, { kind: "PER_DAY", amountPaisa: 1000, capPaisa: 5000 }),
    ).toBe(5000);
  });

  it("allocates payments across invoices", () => {
    const alloc = allocatePayment(
      [
        { id: "a", balancePaisa: 5_000 },
        { id: "b", balancePaisa: 10_000 },
      ],
      7_000,
    );
    expect(alloc).toEqual([
      { invoiceId: "a", appliedPaisa: 5_000 },
      { invoiceId: "b", appliedPaisa: 2_000 },
    ]);
  });

  it("builds equal installments", () => {
    const parts = buildEqualInstallments(100_001, 3, new Date("2026-01-01T00:00:00Z"));
    expect(parts).toHaveLength(3);
    expect(parts.reduce((s, p) => s + p.amountPaisa, 0)).toBe(100_001);
    expect(parts[2]?.amountPaisa).toBe(33335);
  });
});

describe("dates", () => {
  it("formats dates", () => {
    expect(formatDate("2026-09-22T00:00:00.000Z")).toBe("22 Sep 2026");
  });

  it("detects quiet hours overnight", () => {
    expect(isWithinQuietHours(22, 21, 8)).toBe(true);
    expect(isWithinQuietHours(7, 21, 8)).toBe(true);
    expect(isWithinQuietHours(10, 21, 8)).toBe(false);
  });
});
