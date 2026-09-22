import { describe, expect, it } from "vitest";
import {
  shouldAcceptPaymentCallback,
  applyPaymentToInvoice,
  craftAdmissionsReply,
  DEMO_KNOWLEDGE,
  ADMISSIONS_EVAL_CASES,
  buildMorningBriefing,
} from "@maxtrone/core";

describe("phase 1 payment idempotency", () => {
  it("never double-credits the same callback", () => {
    const seen = new Set<string>();
    expect(shouldAcceptPaymentCallback(seen, "cb_1")).toBe(true);
    expect(shouldAcceptPaymentCallback(seen, "cb_1")).toBe(false);

    const first = applyPaymentToInvoice({
      totalPaisa: 10000,
      paidPaisa: 0,
      paymentPaisa: 10000,
    });
    expect(first.status).toBe("PAID");
    const second = applyPaymentToInvoice({
      totalPaisa: 10000,
      paidPaisa: first.paidPaisa,
      paymentPaisa: 10000,
    });
    expect(second.appliedPaisa).toBe(0);
  });
});

describe("phase 1 admissions eval suite size", () => {
  it("has at least 30 multilingual cases", () => {
    expect(ADMISSIONS_EVAL_CASES.length).toBeGreaterThanOrEqual(30);
    const feeReply = craftAdmissionsReply({
      message: "What is the monthly fee for class 8?",
      knowledge: DEMO_KNOWLEDGE,
    });
    expect(feeReply.text).toContain("15,000");
  });
});

describe("phase 1 briefing latency budget helper", () => {
  it("builds under a light payload quickly", () => {
    const t0 = Date.now();
    const body = buildMorningBriefing({
      ownerName: "Ayesha",
      institutionName: "Greenfield",
      feesCollectedYesterdayPaisa: 100000,
      feesCollectedWeekAvgPaisa: 90000,
      absentStudents: 2,
      absentTeachers: 0,
      newInquiries: 1,
      visitsBooked: 0,
      attentionItems: [],
      dashboardUrl: "http://localhost:3000/dashboard",
    });
    expect(Date.now() - t0).toBeLessThan(50);
    expect(body).toContain("Greenfield");
  });
});
