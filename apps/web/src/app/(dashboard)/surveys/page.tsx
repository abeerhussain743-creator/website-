import { aggregateSurveyResponses } from "@maxtrone/core";
import { Button, EmptyState } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";
import { createSurvey, submitSurveyResponse } from "@/actions/phase23";

export default async function SurveysPage() {
  const { db } = await requireTenantContext();
  const surveys = await db.survey.findMany({
    include: { responses: true },
    orderBy: { createdAt: "desc" },
  });
  const agg = aggregateSurveyResponses(
    surveys.flatMap((s) => s.responses.map((r) => ({ surveyId: s.id, rating: r.rating }))),
  );
  const byId = Object.fromEntries(agg.map((a) => [a.surveyId, a]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Parent surveys</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Feedback per teacher — low scores surface for follow-up
        </p>
      </div>

      <form action={createSurvey} className="flex flex-wrap gap-2">
        <input name="title" required placeholder="Ms. Fatima — Class 8 Science" className="min-w-[220px] flex-1 rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
        <Button type="submit">Create survey</Button>
      </form>

      {surveys.length === 0 ? (
        <EmptyState title="No surveys" description="Create a teacher feedback survey for parents." />
      ) : (
        <ul className="space-y-4">
          {surveys.map((s) => {
            const stats = byId[s.id];
            return (
              <li key={s.id} className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="flex justify-between gap-2">
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm tabular-nums">
                    {stats ? `★ ${stats.averageRating} (${stats.responseCount})` : "No responses"}
                  </p>
                </div>
                <form action={submitSurveyResponse} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="surveyId" value={s.id} />
                  <select name="rating" className="rounded-[12px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <input name="comment" placeholder="Optional comment" className="min-w-[160px] flex-1 rounded-[12px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
                  <Button type="submit" variant="outline">Submit</Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
