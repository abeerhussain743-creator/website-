import { Button, EmptyState } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";
import {
  connectInstagramSandbox,
  replyInstagramDm,
  seedInboundInstagramDm,
} from "@/actions/phase23";

export default async function InstagramInboxPage() {
  const { db } = await requireTenantContext();
  const connection = await db.instagramConnection.findFirst();
  const threads = await db.instagramThread.findMany({
    orderBy: { lastMessageAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 50 },
    },
    take: 30,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Instagram DMs</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Sandbox inbox for admissions inquiries from Instagram
          </p>
        </div>
        <form action={connectInstagramSandbox}>
          <Button type="submit" variant="outline">
            {connection ? "Refresh sandbox" : "Connect sandbox"}
          </Button>
        </form>
      </div>

      {!connection ? (
        <EmptyState
          title="Instagram not connected"
          description="Connect the sandbox page to pull demo DMs into this inbox."
        />
      ) : threads.length === 0 ? (
        <EmptyState
          title="No threads yet"
          description="Reconnect sandbox to seed a demo parent conversation."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {threads.map((t) => (
            <section
              key={t.id}
              className="flex flex-col rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{t.displayName}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">@{t.igUserId}</p>
                </div>
                <span className="text-xs text-[var(--muted-foreground)]">{t.status}</span>
              </div>
              <ul className="mt-3 max-h-64 flex-1 space-y-2 overflow-y-auto text-sm">
                {t.messages.map((m) => (
                  <li
                    key={m.id}
                    className={
                      m.direction === "INBOUND"
                        ? "rounded-[12px] bg-[var(--muted)] px-3 py-2"
                        : "ml-6 rounded-[12px] border border-[var(--border)] px-3 py-2"
                    }
                  >
                    <span className="text-[10px] uppercase text-[var(--muted-foreground)]">
                      {m.direction}
                      {m.isAi ? " · AI" : ""}
                    </span>
                    <p className="mt-0.5">{m.body}</p>
                  </li>
                ))}
              </ul>
              <form action={replyInstagramDm} className="mt-3 flex gap-2">
                <input type="hidden" name="threadId" value={t.id} />
                <input
                  name="body"
                  required
                  placeholder="Reply…"
                  className="flex-1 rounded-[12px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                />
                <Button type="submit">Send</Button>
              </form>
              <form action={seedInboundInstagramDm} className="mt-2">
                <input type="hidden" name="threadId" value={t.id} />
                <input type="hidden" name="body" value="When can we visit the campus?" />
                <Button type="submit" variant="outline" size="sm">
                  Simulate inbound
                </Button>
              </form>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
