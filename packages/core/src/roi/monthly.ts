import { formatPkr } from "../money.js";

export type RoiInputs = {
  period: string; // YYYY-MM
  inquiriesAnswered: number;
  avgFirstResponseMinutes: number;
  visitsBooked: number;
  admissionsWon: number;
  admissionsAnnualFeePaisa: number;
  feesRecoveredByAutomationPaisa: number;
  tutorIncomePaisa: number;
  messagesSent: number;
  messagesRead: number;
  atRiskStudentsSaved: number;
};

export type RoiReport = {
  period: string;
  headlinePaisa: number;
  summary: RoiInputs & {
    readRatePct: number;
    headlineText: string;
  };
  whatsappBody: string;
};

/**
 * Attribution: fees recovered by automation = paid within 72h of auto reminder
 * (caller supplies that figure). Headline = admissions value + recovered fees + tutor.
 */
export function buildMonthlyRoiReport(input: RoiInputs): RoiReport {
  const headlinePaisa =
    input.admissionsAnnualFeePaisa +
    input.feesRecoveredByAutomationPaisa +
    input.tutorIncomePaisa;

  const readRatePct =
    input.messagesSent > 0
      ? Math.round((input.messagesRead / input.messagesSent) * 100)
      : 0;

  const headlineText = `Maxtrone helped you gain or save ${formatPkr(headlinePaisa)} this month.`;

  const whatsappBody = [
    `📊 Monthly ROI — ${input.period}`,
    headlineText,
    `• Inquiries answered: ${input.inquiriesAnswered} (avg reply ${input.avgFirstResponseMinutes} min)`,
    `• Visits booked: ${input.visitsBooked} · Admissions won: ${input.admissionsWon}`,
    `• Fees recovered by automation: ${formatPkr(input.feesRecoveredByAutomationPaisa)}`,
    `• Tutor income: ${formatPkr(input.tutorIncomePaisa)}`,
    `• Messages: ${input.messagesSent} sent · ${readRatePct}% read`,
    `• At-risk students saved: ${input.atRiskStudentsSaved}`,
  ].join("\n");

  return {
    period: input.period,
    headlinePaisa,
    summary: { ...input, readRatePct, headlineText },
    whatsappBody,
  };
}

/** Fee counts as automation-recovered if paid within 72h of a recovery reminder. */
export function isAutomationRecovered(input: {
  reminderSentAt: Date;
  paidAt: Date;
  windowHours?: number;
}): boolean {
  const windowMs = (input.windowHours ?? 72) * 60 * 60 * 1000;
  const delta = input.paidAt.getTime() - input.reminderSentAt.getTime();
  return delta >= 0 && delta <= windowMs;
}
