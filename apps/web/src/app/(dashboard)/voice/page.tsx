import { Button, EmptyState } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";
import { placeFeeVoiceCall, synthesizeVoiceNote } from "@/actions/phase23";

export default async function VoicePage() {
  const { db } = await requireTenantContext();
  const [notes, calls, guardians] = await Promise.all([
    db.voiceNote.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    db.voiceCall.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    db.guardian.findMany({ where: { deletedAt: null }, take: 50 }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Voice</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Urdu TTS notes and outbound fee/absence calls (10am–7pm)
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="font-display text-xl">Synthesize voice note</h2>
          <form action={synthesizeVoiceNote} className="space-y-3">
            <textarea
              name="text"
              required
              rows={3}
              placeholder="Assalam o alaikum. {{student_name}} ki fee {{amount_due}} pending hai."
              className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                name="studentName"
                placeholder="Student name"
                className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
              />
              <input
                name="amountDue"
                placeholder="PKR 15,000"
                className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
              />
            </div>
            <input type="hidden" name="language" value="ur-PK" />
            <Button type="submit">Generate & cache</Button>
          </form>
          {notes.length === 0 ? (
            <EmptyState title="No voice notes yet" description="Generate one to cache audio by text hash." />
          ) : (
            <ul className="space-y-2 text-sm">
              {notes.map((n) => (
                <li key={n.id} className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-3">
                  <p className="line-clamp-2">{n.text}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {n.characters} chars · {n.durationMs}ms · {n.audioUrl}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl">Place fee call</h2>
          <form action={placeFeeVoiceCall} className="space-y-3">
            <select
              name="guardianId"
              className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="">Select guardian</option>
              {guardians.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.fullName} ({g.phone})
                </option>
              ))}
            </select>
            <input
              name="phone"
              required
              placeholder="+92300..."
              className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
            />
            <Button type="submit">Call now</Button>
          </form>
          {calls.length === 0 ? (
            <EmptyState title="No calls yet" description="Outcomes, transcripts and promised dates land here." />
          ) : (
            <ul className="space-y-2 text-sm">
              {calls.map((c) => (
                <li key={c.id} className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-3">
                  <p className="font-medium">
                    {c.phone} · {c.outcome ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {c.transcript ?? "No transcript"}
                    {c.promisedDate
                      ? ` · promised ${new Date(c.promisedDate).toISOString().slice(0, 10)}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
