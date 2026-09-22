export type ProgressInputs = {
  studentName: string;
  weekLabel: string;
  presentDays: number;
  totalDays: number;
  latestTestTitle?: string | null;
  latestScore?: number | null;
  latestTotal?: number | null;
  teacherRemark?: string | null;
  language?: "ROMAN_UR" | "EN" | "UR";
};

/** Short 4–6 line weekly note grounded only in provided facts. */
export function craftWeeklyProgressNote(input: ProgressInputs): string {
  const lang = input.language ?? "ROMAN_UR";
  const attPct =
    input.totalDays > 0
      ? Math.round((input.presentDays / input.totalDays) * 100)
      : null;

  if (lang === "EN") {
    const lines = [
      `Weekly update for ${input.studentName} (${input.weekLabel}):`,
      attPct == null
        ? "Attendance data is being finalized."
        : `Attendance: ${input.presentDays}/${input.totalDays} days (${attPct}%).`,
    ];
    if (input.latestTestTitle && input.latestScore != null && input.latestTotal) {
      lines.push(
        `Latest test (${input.latestTestTitle}): ${input.latestScore}/${input.latestTotal}.`,
      );
    }
    if (input.teacherRemark) lines.push(`Teacher note: ${input.teacherRemark}`);
    lines.push("Please reach out if you have any questions.");
    return lines.join("\n");
  }

  const lines = [
    `${input.studentName} ka weekly update (${input.weekLabel}):`,
    attPct == null
      ? "Hazri data abhi finalize ho raha hai."
      : `Hazri: ${input.presentDays}/${input.totalDays} din (${attPct}%).`,
  ];
  if (input.latestTestTitle && input.latestScore != null && input.latestTotal) {
    lines.push(
      `Akhri test (${input.latestTestTitle}): ${input.latestScore}/${input.latestTotal}.`,
    );
  }
  if (input.teacherRemark) lines.push(`Teacher: ${input.teacherRemark}`);
  lines.push("Koi sawal ho to school se rabta karein.");
  return lines.join("\n");
}
