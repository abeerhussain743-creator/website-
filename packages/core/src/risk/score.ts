export type RiskFactorInput = {
  attendanceDropPct?: number; // e.g. 30 means down 30%
  consecutiveAbsences?: number;
  overdueInvoiceCount?: number;
  marksFalling?: boolean;
  negativeFeedback?: boolean;
  siblingLeft?: boolean;
};

export type RiskResult = {
  score: number;
  reasons: string[];
  suggestedAction: string;
};

/**
 * Explainable 0–100 risk score. Rules are additive and capped.
 */
export function computeRiskScore(input: RiskFactorInput): RiskResult {
  let score = 0;
  const reasons: string[] = [];

  if ((input.attendanceDropPct ?? 0) >= 20) {
    const drop = input.attendanceDropPct!;
    score += Math.min(35, Math.round(drop * 0.8));
    reasons.push(`Attendance down ${drop}% this month`);
  }
  if ((input.consecutiveAbsences ?? 0) >= 3) {
    score += 20;
    reasons.push(`${input.consecutiveAbsences} consecutive absences`);
  }
  if ((input.overdueInvoiceCount ?? 0) > 0) {
    score += Math.min(25, input.overdueInvoiceCount! * 12);
    reasons.push(`${input.overdueInvoiceCount} invoice(s) overdue`);
  }
  if (input.marksFalling) {
    score += 15;
    reasons.push("Marks trending down");
  }
  if (input.negativeFeedback) {
    score += 10;
    reasons.push("Negative feedback / complaint");
  }
  if (input.siblingLeft) {
    score += 15;
    reasons.push("Sibling left the institution");
  }

  score = Math.min(100, Math.max(0, score));

  let suggestedAction = "Monitor";
  if (score >= 70) suggestedAction = "Call parent and schedule meeting";
  else if (score >= 40) suggestedAction = "Call the parent";
  else if (score >= 20) suggestedAction = "Send a check-in message";

  return { score, reasons, suggestedAction };
}
