import { Button, EmptyState, Kpi } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";
import {
  createTest,
  generateOmrSheet,
  publishTestResults,
  reviewOmrScan,
  saveMarks,
  uploadOmrScan,
} from "@/actions/phase23";

export default async function TestsPage() {
  const { db } = await requireTenantContext();
  const [tests, students, groups, scans] = await Promise.all([
    db.test.findMany({
      where: { deletedAt: null },
      orderBy: { testDate: "desc" },
      include: { marks: true, subject: true, questions: true },
      take: 30,
    }),
    db.student.findMany({ where: { status: "ACTIVE", deletedAt: null }, take: 100 }),
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
          Marks grid, publish to WhatsApp, phone-photo MCQ review
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Tests" value={String(tests.length)} />
        <Kpi label="Needs OMR review" value={String(scans.length)} />
        <Kpi
          label="Latest published"
          value={latest?.publishedAt ? "Yes" : "Draft"}
        />
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
          {tests.map((t) => (
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
                  <form action={publishTestResults.bind(null, t.id)}>
                    <Button type="submit" variant="accent">Publish results</Button>
                  </form>
                </div>
              </div>

              <form
                action={saveMarks}
                className="mt-4 space-y-2"
              >
                <input type="hidden" name="testId" value={t.id} />
                <input
                  type="hidden"
                  name="marksJson"
                  value={JSON.stringify(
                    students.slice(0, 5).map((s, i) => ({
                      studentId: s.id,
                      score: Math.max(0, t.totalMarks - i),
                      weakTopics: i > 0 ? ["Algebra"] : [],
                    })),
                  )}
                />
                <p className="text-xs text-[var(--muted-foreground)]">
                  Demo: saves ranked marks for first {Math.min(5, students.length)} students
                </p>
                <Button type="submit" variant="outline">Save demo marks</Button>
              </form>

              {t.marks.length > 0 && (
                <table className="mt-3 w-full text-left text-sm">
                  <thead>
                    <tr className="text-[var(--muted-foreground)]">
                      <th className="py-1">Student</th>
                      <th>Score</th>
                      <th>Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.marks.map((m) => (
                      <tr key={m.id} className="border-t border-[var(--border)]">
                        <td className="py-1">{m.studentId.slice(0, 8)}…</td>
                        <td>{m.score}/{t.totalMarks}</td>
                        <td>{m.rank ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <form action={uploadOmrScan} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="testId" value={t.id} />
                <input
                  name="imageUrl"
                  placeholder="mock://photo.jpg"
                  defaultValue={`mock://omr-photo/${t.id}.jpg`}
                  className="min-w-[200px] flex-1 rounded-[12px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                />
                <Button type="submit" variant="outline">Queue OMR scan</Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {scans.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl">OMR review</h2>
          {scans.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
              <div>
                <p>Confidence {Math.round(s.confidence * 100)}% · score {s.score ?? "—"}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{s.imageUrl}</p>
              </div>
              <div className="flex gap-2">
                <form action={reviewOmrScan.bind(null, s.id, true)}>
                  <Button type="submit">Accept</Button>
                </form>
                <form action={reviewOmrScan.bind(null, s.id, false)}>
                  <Button type="submit" variant="outline">Reject</Button>
                </form>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
