import { formatPkr } from "@maxtrone/core";
import { Button, EmptyState, Kpi } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";
import {
  askTutorDemo,
  closeRevenueSharePeriod,
  enrollTutorStudent,
  uploadSyllabusChunk,
} from "@/actions/phase23";

export default async function TutorPage() {
  const { db } = await requireTenantContext();
  const [enrollments, docs, alerts, ledger, students, messages] = await Promise.all([
    db.tutorEnrollment.findMany({
      include: { student: true, subscriptions: true },
      take: 40,
    }),
    db.syllabusDocument.findMany({ include: { chunks: true }, take: 20 }),
    db.safeguardingAlert.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    db.revenueShareLedger.findMany({ orderBy: { period: "desc" }, take: 6 }),
    db.student.findMany({ where: { status: "ACTIVE", deletedAt: null }, take: 50 }),
    db.tutorMessage.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const period = new Date().toISOString().slice(0, 7);
  const active = enrollments.filter((e) => e.active).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">AI Tutor</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Syllabus-grounded WhatsApp tutoring · safety · revenue share
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Active seats" value={String(active)} />
        <Kpi label="Syllabus docs" value={String(docs.length)} />
        <Kpi label="Open alerts" value={String(alerts.filter((a) => a.status === "OPEN").length)} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-display text-xl">Enroll student</h2>
          <form action={enrollTutorStudent} className="space-y-2">
            <select name="studentId" required className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName}</option>
              ))}
            </select>
            <input name="pricePkr" type="number" defaultValue={750} className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
            <Button type="submit">Enroll with consent</Button>
          </form>

          <h2 className="font-display text-xl pt-4">Upload syllabus chunk</h2>
          <form action={uploadSyllabusChunk} className="space-y-2">
            <input name="title" placeholder="Document title" defaultValue="Science Class 8" className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
            <input name="chapter" placeholder="Chapter" defaultValue="2" className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
            <input name="topic" placeholder="Topic" defaultValue="Photosynthesis" className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
            <textarea name="content" required rows={4} placeholder="Chunk content…" defaultValue="Photosynthesis converts light energy into chemical energy in plants using chlorophyll." className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
            <Button type="submit" variant="outline">Ingest</Button>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">Demo ask</h2>
          {enrollments[0] ? (
            <form action={askTutorDemo} className="space-y-2">
              <input type="hidden" name="enrollmentId" value={enrollments[0].id} />
              <textarea name="message" required rows={3} placeholder="Explain photosynthesis from chapter 2" className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
              <Button type="submit">Ask tutor</Button>
            </form>
          ) : (
            <EmptyState title="Enroll a student first" description="Parent consent is required before tutoring." />
          )}

          {messages.length > 0 && (
            <ul className="space-y-2 text-sm">
              {messages.map((m) => (
                <li key={m.id} className="rounded-[12px] border border-[var(--border)] p-3">
                  <span className="text-xs uppercase text-[var(--muted-foreground)]">{m.role}</span>
                  <p className="mt-1 whitespace-pre-wrap">{m.content}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Revenue share</h2>
          <form action={closeRevenueSharePeriod.bind(null, period)}>
            <Button type="submit" variant="outline">Close {period}</Button>
          </form>
        </div>
        {ledger.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No ledger rows yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {ledger.map((row) => (
              <li key={row.id} className="flex flex-wrap justify-between gap-2 rounded-[12px] border border-[var(--border)] px-3 py-2">
                <span>{row.period}</span>
                <span>Gross {formatPkr(row.grossPaisa)}</span>
                <span>Institution {formatPkr(row.institutionSharePaisa)}</span>
                <span>Platform {formatPkr(row.platformSharePaisa)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {alerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl">Safeguarding</h2>
          {alerts.map((a) => (
            <div key={a.id} className="rounded-[12px] border border-[var(--danger)]/40 bg-[var(--card)] p-3 text-sm">
              <p className="font-medium">{a.severity} · {a.status}</p>
              <p className="mt-1 text-[var(--muted-foreground)]">{a.triggerText}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
