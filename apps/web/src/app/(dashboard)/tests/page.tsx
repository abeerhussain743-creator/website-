import Link from "next/link";
import { Button, EmptyState, Kpi } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";
import {
  createTest,
  generateOmrSheet,
  generateReportCards,
  publishTestResults,
  uploadOmrScan,
} from "@/actions/phase23";
import { MarksGrid } from "./marks-grid";
import { OmrReviewCard } from "./omr-review";

export default async function TestsPage() {
  const { db } = await requireTenantContext();
  const [tests, students, groups, scans] = await Promise.all([
    db.test.findMany({
      where: { deletedAt: null },
      orderBy: { testDate: "desc" },
      include: {
        marks: { include: { student: true } },
        subject: true,
        questions: true,
      },
      take: 30,
    }),
    db.student.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      orderBy: { fullName: "asc" },
      take: 100,
    }),
    db.group.findMany({ orderBy: { sortOrder: "asc" } }),
    db.oMRScan.findMany({
      where: { status: "NEEDS_REVIEW" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const latest = tests[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Tests & OMR</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Spreadsheet marks grid · publish to WhatsApp · phone-photo MCQ review
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Tests" value={String(tests.length)} />
        <Kpi label="Needs OMR review" value={String(scans.length)} />
        <Kpi label="Latest published" value={latest?.publishedAt ? "Yes" : "Draft"} />
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Create test</h2>
        <form action={createTest} className="grid gap-2 md:grid-cols-4">
          <input name="title" required placeholder="Title" className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
          <input name="subject" placeholder="Subject" defaultValue="Math" className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
          <input name="totalMarks" type="number" required defaultValue={10} className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
          <input name="testDate" type="date" required className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
          <select name="groupId" className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <input type="hidden" name="questionCount" value="5" />
          <Button type="submit">Create</Button>
        </form>
      </section>

      {tests.length === 0 ? (
        <EmptyState title="No tests" description="Create a test to enter marks and generate OMR sheets." />
      ) : (
        <ul className="space-y-4">
          {tests.map((t) => {
            const markByStudent = new Map(t.marks.map((m) => [m.studentId, m]));
            const gridRows = students.map((s) => {
              const existing = markByStudent.get(s.id);
              return {
                id: s.id,
                fullName: s.fullName,
                score: existing?.score ?? 0,
                weakTopics: (existing?.weakTopics ?? []).join(", "),
              };
            });
            return (
              <li key={t.id} className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {t.subject?.name ?? "General"} · {t.totalMarks} marks ·{" "}
                      {new Date(t.testDate).toISOString().slice(0, 10)}
                      {t.publishedAt ? " · published" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={generateOmrSheet.bind(null, t.id)}>
                      <Button type="submit" variant="outline">OMR sheet</Button>
                    </form>
                    <form action={generateReportCards.bind(null, t.id)}>
                      <Button type="submit" variant="outline">Report cards</Button>
                    </form>
                    <form action={publishTestResults.bind(null, t.id)}>
                      <Button type="submit" variant="accent">Publish results</Button>
                    </form>
                  </div>
                </div>

                <MarksGrid testId={t.id} totalMarks={t.totalMarks} initial={gridRows} />

                {t.marks.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {t.marks.slice(0, 3).map((m) => (
                      <Link
                        key={m.id}
                        href={`/api/reports/card/${m.studentId}`}
                        className="rounded-[8px] border border-[var(--border)] px-2 py-1 hover:bg-[var(--muted)]"
                        target="_blank"
                      >
                        Card: {m.student.fullName}
                      </Link>
                    ))}
                  </div>
                )}

                <form action={uploadOmrScan} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="testId" value={t.id} />
                  <input
                    name="imageUrl"
                    placeholder="mock://photo.jpg"
                    defaultValue={`mock://omr-photo/${t.id}.jpg`}
                    className="min-w-[200px] flex-1 rounded-[12px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  />
                  <label className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <input type="checkbox" name="forceReview" value="1" />
                    Force low-confidence review
                  </label>
                  <Button type="submit" variant="outline">Queue OMR scan</Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      {scans.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl">OMR review</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Fix uncertain bubbles, then accept — nothing low-confidence publishes automatically.
          </p>
          {scans.map((s) => {
            const raw = (s.rawAnswers as Array<{ questionNumber: number; option: string; confidence: number }> | null) ?? [];
            return (
              <OmrReviewCard
                key={s.id}
                scanId={s.id}
                imageUrl={s.imageUrl}
                confidence={s.confidence}
                score={s.score}
                answers={raw}
              />
            );
          })}
        </section>
      )}
    </div>
  );
}
