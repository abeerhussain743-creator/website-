export type MarkInput = {
  studentId: string;
  score: number;
  weakTopics?: string[];
};

export type RankedMark = MarkInput & {
  rank: number;
};

/** Dense ranking: equal scores share the same rank, next rank skips. */
export function rankMarks(marks: MarkInput[]): RankedMark[] {
  const sorted = [...marks].sort((a, b) => b.score - a.score);
  const result: RankedMark[] = [];
  let lastScore: number | null = null;
  let lastRank = 0;
  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i]!;
    const rank = lastScore === m.score ? lastRank : i + 1;
    lastScore = m.score;
    lastRank = rank;
    result.push({ ...m, rank, weakTopics: m.weakTopics ?? [] });
  }
  return result;
}

export function weakTopicsFromAnswers(input: {
  questions: Array<{ number: number; topic?: string | null; correctOption?: string | null }>;
  answers: Record<string, string>;
}): string[] {
  const weak = new Set<string>();
  for (const q of input.questions) {
    if (!q.topic || !q.correctOption) continue;
    const given = input.answers[String(q.number)] ?? input.answers[q.number];
    if (!given || given.toUpperCase() !== q.correctOption.toUpperCase()) {
      weak.add(q.topic);
    }
  }
  return [...weak];
}

export function parentResultMessage(input: {
  studentName: string;
  testTitle: string;
  score: number;
  totalMarks: number;
  rank?: number | null;
  weakTopics?: string[];
}): string {
  const pct = Math.round((input.score / Math.max(1, input.totalMarks)) * 100);
  const rankBit =
    input.rank != null ? ` Class rank: ${input.rank}.` : "";
  const weak =
    input.weakTopics && input.weakTopics.length
      ? ` Focus areas: ${input.weakTopics.join(", ")}.`
      : "";
  return `${input.studentName} scored ${input.score}/${input.totalMarks} (${pct}%) in ${input.testTitle}.${rankBit}${weak}`;
}
