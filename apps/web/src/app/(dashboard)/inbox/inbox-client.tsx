"use client";

import * as React from "react";
import { Button } from "@maxtrone/ui";

type Conversation = {
  id: string;
  phone: string;
  status: string;
  aiPaused: boolean;
  windowExpiresAt: string | null;
  lastMessageAt: string | null;
};

export function InboxClient({ initial }: { initial: Conversation[] }) {
  const [conversations, setConversations] = React.useState(initial);
  const [active, setActive] = React.useState<string | null>(initial[0]?.id ?? null);
  const [body, setBody] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [simPhone, setSimPhone] = React.useState("+923001234567");
  const [simBody, setSimBody] = React.useState("Class 8 ki fee kitni hai?");

  async function refresh() {
    const res = await fetch("/api/inbox");
    const data = await res.json();
    setConversations(data.conversations ?? []);
  }

  async function send() {
    if (!active || !body.trim()) return;
    setError(null);
    const res = await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", conversationId: active, body, force: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setBody("");
  }

  async function simulateInbound() {
    setError(null);
    const res = await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "inbound_simulate", phone: simPhone, body: simBody }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    await refresh();
    setActive(data.conversationId);
  }

  const current = conversations.find((c) => c.id === active);
  const windowOpen =
    current?.windowExpiresAt && new Date(current.windowExpiresAt) > new Date();

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-[16px] border border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] p-3 text-sm font-medium">Conversations</div>
        <ul className="max-h-[480px] overflow-auto">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setActive(c.id)}
                className={`block w-full px-3 py-3 text-left text-sm ${
                  active === c.id ? "bg-[var(--muted)]" : ""
                }`}
              >
                <span className="font-medium">{c.phone}</span>
                <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
                  {c.status}
                  {c.aiPaused ? " · AI paused" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="space-y-4 rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4">
        {current ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{current.phone}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  24h window: {windowOpen ? "open" : "closed (templates only)"}
                </p>
              </div>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Reply…"
              className="min-h-28 w-full rounded-[12px] border border-[var(--border)] px-3 py-2 text-sm"
            />
            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
            <Button type="button" onClick={send}>
              Send
            </Button>
          </>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">Select a conversation</p>
        )}

        <div className="border-t border-[var(--border)] pt-4">
          <p className="mb-2 text-sm font-medium">Sandbox: simulate inbound WhatsApp</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={simPhone}
              onChange={(e) => setSimPhone(e.target.value)}
              className="h-10 rounded-[12px] border border-[var(--border)] px-3 text-sm"
            />
            <input
              value={simBody}
              onChange={(e) => setSimBody(e.target.value)}
              className="h-10 flex-1 rounded-[12px] border border-[var(--border)] px-3 text-sm"
            />
            <Button type="button" variant="outline" onClick={simulateInbound}>
              Simulate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
