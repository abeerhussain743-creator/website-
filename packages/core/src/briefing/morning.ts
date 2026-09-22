import { formatPkr } from "../money.js";

export type BriefingInput = {
  ownerName: string;
  institutionName: string;
  feesCollectedYesterdayPaisa: number;
  feesCollectedWeekAvgPaisa: number;
  absentStudents: number;
  absentTeachers: number;
  newInquiries: number;
  visitsBooked: number;
  attentionItems: string[];
  dashboardUrl: string;
  isHoliday?: boolean;
  holidayNote?: string;
};

export function buildMorningBriefing(input: BriefingInput): string {
  if (input.isHoliday) {
    return (
      input.holidayNote ??
      `Good morning, ${input.ownerName}. ${input.institutionName} is on holiday today — no briefing.`
    );
  }

  const lines: string[] = [
    `Good morning, ${input.ownerName}. Here's ${input.institutionName} today:`,
  ];

  if (input.feesCollectedYesterdayPaisa > 0 || input.feesCollectedWeekAvgPaisa > 0) {
    const delta =
      input.feesCollectedWeekAvgPaisa > 0
        ? Math.round(
            ((input.feesCollectedYesterdayPaisa - input.feesCollectedWeekAvgPaisa) /
              input.feesCollectedWeekAvgPaisa) *
              100,
          )
        : 0;
    const arrow =
      delta > 0 ? ` (↑${delta}% vs last week avg)` : delta < 0 ? ` (↓${Math.abs(delta)}% vs last week avg)` : "";
    lines.push(
      `💰 Fees collected yesterday: ${formatPkr(input.feesCollectedYesterdayPaisa)}${arrow}`,
    );
  }

  if (input.absentStudents > 0 || input.absentTeachers > 0) {
    lines.push(
      `🙋 Absent today: ${input.absentStudents} students${input.absentTeachers ? `, ${input.absentTeachers} teachers` : ""}`,
    );
  }

  if (input.newInquiries > 0) {
    lines.push(
      `📥 New admission inquiries: ${input.newInquiries}${input.visitsBooked ? ` (${input.visitsBooked} visits booked)` : ""}`,
    );
  }

  if (input.attentionItems.length > 0) {
    lines.push("⚠️ Needs attention:");
    for (const item of input.attentionItems.slice(0, 5)) {
      lines.push(`  • ${item}`);
    }
  }

  if (lines.length === 1) {
    lines.push("All quiet — no noteworthy items this morning.");
  }

  lines.push(`📊 Full dashboard: ${input.dashboardUrl}`);
  return lines.join("\n");
}
