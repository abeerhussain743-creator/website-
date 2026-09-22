export type SurveyAggregate = {
  surveyId: string;
  responseCount: number;
  averageRating: number;
  lowScoreCount: number;
};

export function aggregateSurveyResponses(
  responses: Array<{ surveyId: string; rating: number }>,
): SurveyAggregate[] {
  const map = new Map<string, { sum: number; n: number; low: number }>();
  for (const r of responses) {
    const cur = map.get(r.surveyId) ?? { sum: 0, n: 0, low: 0 };
    cur.sum += r.rating;
    cur.n += 1;
    if (r.rating <= 2) cur.low += 1;
    map.set(r.surveyId, cur);
  }
  return [...map.entries()].map(([surveyId, v]) => ({
    surveyId,
    responseCount: v.n,
    averageRating: v.n ? Math.round((v.sum / v.n) * 10) / 10 : 0,
    lowScoreCount: v.low,
  }));
}
