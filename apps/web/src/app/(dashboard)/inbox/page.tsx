import { requireTenantContext } from "@/lib/tenant";
import { InboxClient } from "./inbox-client";

export default async function InboxPage() {
  const { db } = await requireTenantContext();
  const conversations = await db.conversation.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">WhatsApp inbox</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Shared inbox · 24-hour window enforced · AI handoff
        </p>
      </div>
      <InboxClient
        initial={conversations.map((c) => ({
          id: c.id,
          phone: c.phone,
          status: c.status,
          aiPaused: c.aiPaused,
          windowExpiresAt: c.windowExpiresAt?.toISOString() ?? null,
          lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
