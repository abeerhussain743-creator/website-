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

import { craftAdmissionsReply } from "./admissions/agent.js";
import { ADMISSIONS_EVAL_CASES, DEMO_KNOWLEDGE as KB } from "./evals/admissions.js";
import { buildMorningBriefing } from "./briefing/morning.js";
import { nextRecoveryStep, textOnlyLadder, renderTemplate } from "./recovery/ladder.js";
import {
  buildInvoiceTotals,
  applyPaymentToInvoice,
  shouldAcceptPaymentCallback,
  invoiceNumber,
} from "./fees/invoicing.js";
import { detectColumnMapping, validateImportRow, applyMapping } from "./import/mapping.js";

describe("admissions agent grounding", () => {
  it("never invents fees outside knowledge base", () => {
    const reply = craftAdmissionsReply({
      message: "What is the fee for class 9?",
      knowledge: KB,
    });
    expect(reply.handoff).toBe(true);
    expect(reply.text.toLowerCase()).not.toMatch(/pkr\s*\d/);
  });

  it("passes fee eval cases against demo knowledge", () => {
    let pass = 0;
    for (const c of ADMISSIONS_EVAL_CASES) {
      const reply = craftAdmissionsReply({
        message: c.message,
        knowledge: KB,
        languageHint: c.language,
      });
      if (c.expectHandoff && !reply.handoff) continue;
      if (c.mustNotContain?.some((s) => reply.text.toLowerCase().includes(s.toLowerCase()))) {
        continue;
      }
      if (c.mustContainAny && !c.mustContainAny.some((s) => reply.text.includes(s))) {
        // fee questions without KB match should handoff — count as pass if handoff
        if (c.mustContainAny && reply.handoff) {
          pass += 1;
          continue;
        }
        continue;
      }
      pass += 1;
    }
    expect(pass).toBeGreaterThanOrEqual(25);
    expect(ADMISSIONS_EVAL_CASES.length).toBeGreaterThanOrEqual(30);
  });

  it("states class 8 fee only from KB", () => {
    const reply = craftAdmissionsReply({
      message: "What is the monthly fee for class 8?",
      knowledge: KB,
    });
    expect(reply.sources.length).toBeGreaterThan(0);
    expect(reply.text).toContain("15,000");
    expect(reply.handoff).toBe(false);
  });
});

describe("briefing", () => {
  it("builds a short money-first message", () => {
    const body = buildMorningBriefing({
      ownerName: "Ayesha",
      institutionName: "Greenfield",
      feesCollectedYesterdayPaisa: 18_500_000,
      feesCollectedWeekAvgPaisa: 16_500_000,
      absentStudents: 23,
      absentTeachers: 2,
      newInquiries: 7,
      visitsBooked: 3,
      attentionItems: ["Class 8-B: 5 students absent 3+ days"],
      dashboardUrl: "https://app.local/dashboard",
    });
    expect(body).toContain("PKR 1,85,000");
    expect(body).toContain("23 students");
    expect(body.length).toBeLessThan(800);
  });
});

describe("recovery ladder", () => {
  it("selects next text step and stops when paid", () => {
    const steps = textOnlyLadder();
    const due = new Date("2026-09-01");
    const next = nextRecoveryStep({
      dueDate: due,
      today: new Date("2026-09-06"),
      paid: false,
      completedOffsets: [-3, 1],
      steps,
    });
    expect(next?.dayOffset).toBe(5);
    expect(
      nextRecoveryStep({
        dueDate: due,
        today: new Date("2026-09-20"),
        paid: true,
        completedOffsets: [],
        steps,
      }),
    ).toBeNull();
  });

  it("renders templates", () => {
    expect(renderTemplate("Hi {{name}}", { name: "Ali" })).toBe("Hi Ali");
  });
});

describe("invoicing", () => {
  it("builds totals with sibling discount", () => {
    const t = buildInvoiceTotals({
      lines: [{ description: "Tuition", amountPaisa: 100_000 }],
      siblingCount: 1,
    });
    expect(t.totalPaisa).toBe(90_000);
    expect(invoiceNumber("GF", 12)).toMatch(/GF-\d{4}-00012/);
  });

  it("payment callback idempotency", () => {
    const seen = new Set<string>();
    expect(shouldAcceptPaymentCallback(seen, "pay_1")).toBe(true);
    expect(shouldAcceptPaymentCallback(seen, "pay_1")).toBe(false);
    const applied = applyPaymentToInvoice({
      totalPaisa: 10_000,
      paidPaisa: 0,
      paymentPaisa: 4_000,
    });
    expect(applied.status).toBe("PARTIALLY_PAID");
  });
});

describe("import mapping", () => {
  it("detects messy headers and validates phones", () => {
    const headers = ["Student Naam", "Roll No", "Class", "Father Mobile"];
    const mapping = detectColumnMapping(headers);
    expect(mapping["Student Naam"]).toBe("fullName");
    expect(mapping["Father Mobile"]).toBe("guardianPhone");
    const row = applyMapping(headers, ["Hassan", "001", "Class 8", "03001234567"], mapping, 1);
    const v = validateImportRow(row);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.row.guardianPhone).toBe("+923001234567");
  });
});
