import { describe, expect, it } from "vitest";
import {
  canPlaceVoiceCall,
  normalizeCallOutcome,
  voiceNoteTextHash,
  craftParentHelpdeskReply,
  rankMarks,
  gradeOmrMock,
  craftWeeklyProgressNote,
  computeRiskScore,
  buildMonthlyRoiReport,
  isAutomationRecovered,
  craftTutorReply,
  TUTOR_SAFETY_EVAL_CASES,
  splitTutorRevenue,
  withinDailyTutorCap,
  aggregateSurveyResponses,
  distanceMeters,
  transportEtaMessage,
  isMagicLinkValid,
  buildReferralCode,
  buildRoiReportHtml,
  buildReportCardHtml,
  buildMinimalPdf,
  parseMarksPaste,
} from "@maxtrone/core";

describe("phase 2 voice", () => {
  it("hashes voice notes stably and gates calling hours", () => {
    expect(voiceNoteTextHash("hello", "ur-PK")).toBe(
      voiceNoteTextHash("hello", "ur-PK"),
    );
    expect(canPlaceVoiceCall({ hour: 9 }).ok).toBe(false);
    expect(canPlaceVoiceCall({ hour: 11 }).ok).toBe(true);
    expect(normalizeCallOutcome("Parent promised tomorrow")).toBe("promised_date");
  });
});

describe("phase 2 helpdesk", () => {
  it("answers fee status for own children only", () => {
    const reply = craftParentHelpdeskReply({
      message: "Kitni fee pending hai?",
      children: [
        {
          studentId: "s1",
          fullName: "Hassan Ali",
          outstandingPaisa: 1500000,
          nextDueDate: "2026-10-01",
        },
      ],
      knowledge: [],
    });
    expect(reply.handoff).toBe(false);
    expect(reply.text).toContain("Hassan Ali");
    expect(reply.sources).toContain("live:invoices");
  });
});

describe("phase 2 academics", () => {
  it("ranks marks and grades OMR with review flag", () => {
    const ranked = rankMarks([
      { studentId: "a", score: 90 },
      { studentId: "b", score: 90 },
      { studentId: "c", score: 70 },
    ]);
    expect(ranked[0]!.rank).toBe(1);
    expect(ranked[1]!.rank).toBe(1);
    expect(ranked[2]!.rank).toBe(3);

    const omr = gradeOmrMock({
      imageUrl: "mock://sheet1.jpg",
      questions: [
        { number: 1, correctOption: "A", marks: 1 },
        { number: 2, correctOption: "B", marks: 1 },
      ],
      forceLowConfidence: true,
    });
    expect(omr.needsReview).toBe(true);
  });

  it("builds weekly progress notes", () => {
    const note = craftWeeklyProgressNote({
      studentName: "Hassan",
      weekLabel: "15–21 Sep",
      presentDays: 4,
      totalDays: 5,
      latestTestTitle: "Math quiz",
      latestScore: 8,
      latestTotal: 10,
    });
    expect(note).toContain("Hassan");
    expect(note.split("\n").length).toBeGreaterThanOrEqual(4);
  });
});

describe("phase 2 risk + roi", () => {
  it("explains risk and builds ROI headline", () => {
    const risk = computeRiskScore({
      attendanceDropPct: 30,
      overdueInvoiceCount: 2,
      consecutiveAbsences: 3,
    });
    expect(risk.score).toBeGreaterThanOrEqual(40);
    expect(risk.reasons.length).toBeGreaterThan(0);

    const roi = buildMonthlyRoiReport({
      period: "2026-09",
      inquiriesAnswered: 40,
      avgFirstResponseMinutes: 4,
      visitsBooked: 12,
      admissionsWon: 5,
      admissionsAnnualFeePaisa: 5_000_000_00,
      feesRecoveredByAutomationPaisa: 200_000_00,
      tutorIncomePaisa: 50_000_00,
      messagesSent: 1000,
      messagesRead: 800,
      atRiskStudentsSaved: 3,
    });
    expect(roi.headlinePaisa).toBe(5_250_000_00);
    expect(roi.whatsappBody).toContain("Maxtrone helped");

    expect(
      isAutomationRecovered({
        reminderSentAt: new Date("2026-09-01T10:00:00Z"),
        paidAt: new Date("2026-09-02T10:00:00Z"),
      }),
    ).toBe(true);
  });

  it("builds referral codes", () => {
    expect(buildReferralCode({ institutionSlug: "greenfield", guardianId: "abc123xyz" })).toContain(
      "GREENFIE",
    );
  });
});

describe("phase 3 tutor safety", () => {
  it("passes a 50+ prompt safety eval set", () => {
    expect(TUTOR_SAFETY_EVAL_CASES.length).toBeGreaterThanOrEqual(50);
    const chunks = [
      {
        id: "c1",
        chapter: "2",
        topic: "Photosynthesis",
        page: 55,
        content: "Photosynthesis converts light energy into chemical energy in plants.",
      },
    ];
    for (const c of TUTOR_SAFETY_EVAL_CASES) {
      const reply = craftTutorReply({ message: c.message, chunks });
      if (c.expectDistress) {
        expect(reply.distress, c.id).toBe(true);
      }
      if (c.expectOffTopic) {
        expect(reply.offTopic, c.id).toBe(true);
      }
      if (
        !c.expectDistress &&
        !c.expectOffTopic &&
        /photo|newton|fraction|cell|math|chem|phys/i.test(c.message)
      ) {
        expect(reply.distress, c.id).toBe(false);
      }
    }
  });

  it("splits revenue and enforces daily caps", () => {
    const split = splitTutorRevenue({ grossPaisa: 100_000 });
    expect(split.platformSharePaisa).toBe(30_000);
    expect(split.institutionSharePaisa).toBe(70_000);
    expect(withinDailyTutorCap(39, 40)).toBe(true);
    expect(withinDailyTutorCap(40, 40)).toBe(false);
  });
});

describe("phase 3 surveys transport portal", () => {
  it("aggregates surveys and estimates van ETA", () => {
    const agg = aggregateSurveyResponses([
      { surveyId: "s1", rating: 5 },
      { surveyId: "s1", rating: 3 },
      { surveyId: "s1", rating: 1 },
    ]);
    expect(agg[0]!.averageRating).toBe(3);
    expect(agg[0]!.lowScoreCount).toBe(1);

    const d = distanceMeters(
      { lat: 31.52, lng: 74.35 },
      { lat: 31.521, lng: 74.351 },
    );
    expect(d).toBeGreaterThan(0);
    expect(transportEtaMessage({ routeName: "Gulberg", metersAway: 800 })).toMatch(/away/);

    expect(
      isMagicLinkValid({
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      }),
    ).toBe(true);
  });
});

describe("phase 2/3 polish reports + paste", () => {
  it("builds ROI HTML, report card HTML, minimal PDF, and paste parser", () => {
    const html = buildRoiReportHtml({
      institutionName: "Greenfield",
      period: "2026-09",
      headlinePaisa: 1_000_000,
      headlineText: "Maxtrone helped you gain or save PKR 10,000 this month.",
      inquiriesAnswered: 10,
      avgFirstResponseMinutes: 3,
      visitsBooked: 2,
      admissionsWon: 1,
      admissionsAnnualFeePaisa: 500_000,
      feesRecoveredByAutomationPaisa: 200_000,
      tutorIncomePaisa: 300_000,
      messagesSent: 100,
      readRatePct: 80,
      atRiskStudentsSaved: 1,
    });
    expect(html).toContain("Greenfield");
    expect(html).toContain("Monthly ROI");

    const card = buildReportCardHtml({
      institutionName: "Greenfield",
      studentName: "Hassan",
      termLabel: "Sep 2026",
      subjects: [{ title: "Math", score: 8, total: 10, rank: 1, weakTopics: ["Algebra"] }],
    });
    expect(card).toContain("Hassan");
    expect(card).toContain("Algebra");

    const pdf = buildMinimalPdf(["Hello Maxtrone"]);
    expect(pdf[0]).toBe(0x25); // %
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");

    const pasted = parseMarksPaste("Hassan\t9\nAli\t7", [
      { id: "s1" },
      { id: "s2" },
    ]);
    expect(pasted).toEqual([
      { studentId: "s1", score: 9 },
      { studentId: "s2", score: 7 },
    ]);
  });
});
