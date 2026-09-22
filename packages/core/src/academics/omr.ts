export type OMRBubbleRead = {
  questionNumber: number;
  option: string;
  confidence: number;
};

export type OMRMockResult = {
  studentRegistrationHint?: string;
  answers: OMRBubbleRead[];
  overallConfidence: number;
  needsReview: boolean;
  score: number;
};

const OPTIONS = ["A", "B", "C", "D"] as const;

/**
 * Deterministic mock OMR grader for demos/tests.
 * Low confidence (<0.85) on any bubble → needsReview.
 */
export function gradeOmrMock(input: {
  imageUrl: string;
  questions: Array<{ number: number; correctOption?: string | null; marks?: number }>;
  forceLowConfidence?: boolean;
}): OMRMockResult {
  const seed = hash(input.imageUrl);
  const answers: OMRBubbleRead[] = [];
  let score = 0;

  for (const q of input.questions) {
    const jitter = ((seed + q.number * 17) % 100) / 100;
    let confidence = input.forceLowConfidence ? 0.6 : 0.9 + jitter * 0.09;
    if (confidence > 0.99) confidence = 0.99;

    let option: string;
    if (q.correctOption && jitter > 0.15) {
      option = q.correctOption.toUpperCase();
    } else {
      option = OPTIONS[(seed + q.number) % 4]!;
    }

    if (q.correctOption && option === q.correctOption.toUpperCase()) {
      score += q.marks ?? 1;
    }

    answers.push({
      questionNumber: q.number,
      option,
      confidence: Math.round(confidence * 1000) / 1000,
    });
  }

  const overall =
    answers.length === 0
      ? 0
      : answers.reduce((s, a) => s + a.confidence, 0) / answers.length;
  const needsReview =
    input.forceLowConfidence || answers.some((a) => a.confidence < 0.85);

  return {
    studentRegistrationHint: `GF-${(seed % 900) + 100}`,
    answers,
    overallConfidence: Math.round(overall * 1000) / 1000,
    needsReview,
    score,
  };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function buildOmrQrPayload(testId: string, sheetId: string): string {
  return `maxtrone:omr:${testId}:${sheetId}`;
}
