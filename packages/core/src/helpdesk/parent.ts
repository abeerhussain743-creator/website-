import type { KnowledgeEntry } from "../admissions/agent.js";

export type ParentChildContext = {
  studentId: string;
  fullName: string;
  groupName?: string | null;
  outstandingPaisa?: number;
  nextDueDate?: string | null;
  attendancePct30d?: number | null;
};

export type HelpdeskReply = {
  text: string;
  sources: string[];
  handoff: boolean;
  draftForInbox?: string;
};

const HANDOFF =
  /\b(human|person|staff|principal|complaint|شکایت|baat kar|talk to)\b/i;

/**
 * Parent helpdesk — answers only about the verified guardian's own children.
 * Never invents fees; uses live child context + KB for general school facts.
 */
export function craftParentHelpdeskReply(input: {
  message: string;
  children: ParentChildContext[];
  knowledge: KnowledgeEntry[];
}): HelpdeskReply {
  const msg = input.message.trim();
  if (!input.children.length) {
    return {
      text: "I couldn't match this phone to a registered parent. A staff member will help you.",
      sources: [],
      handoff: true,
      draftForInbox: msg,
    };
  }

  if (HANDOFF.test(msg)) {
    return {
      text: "Zaroor — a staff member will reply shortly.",
      sources: [],
      handoff: true,
      draftForInbox: msg,
    };
  }

  const names = input.children.map((c) => c.fullName).join(", ");
  const feeAsk = /\b(fee|fees|due|kitni|pending|baki|فیس)\b/i.test(msg);
  if (feeAsk) {
    const lines = input.children.map((c) => {
      const due = c.outstandingPaisa ?? 0;
      const dueStr =
        due <= 0
          ? "no outstanding balance"
          : `PKR ${Math.round(due / 100).toLocaleString("en-PK")} outstanding`;
      const next = c.nextDueDate ? ` (next due ${c.nextDueDate})` : "";
      return `• ${c.fullName}: ${dueStr}${next}`;
    });
    return {
      text: `Assalam o alaikum. Fee status for ${names}:\n${lines.join("\n")}`,
      sources: ["live:invoices"],
      handoff: false,
    };
  }

  const attendanceAsk = /\b(attend|hazri|absent|present|حاضری)\b/i.test(msg);
  if (attendanceAsk) {
    const lines = input.children.map((c) => {
      const pct =
        c.attendancePct30d == null
          ? "attendance data not ready yet"
          : `${c.attendancePct30d}% present (last 30 days)`;
      return `• ${c.fullName}: ${pct}`;
    });
    return {
      text: `Attendance update:\n${lines.join("\n")}`,
      sources: ["live:attendance"],
      handoff: false,
    };
  }

  const openAsk = /\b(open|holiday|band|school|ptm|homework|ghar ka kaam)\b/i.test(
    msg,
  );
  if (openAsk && input.knowledge.length) {
    const scored = input.knowledge
      .map((k) => ({
        k,
        score: overlap(msg, `${k.title} ${k.body}`),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    if (scored[0]) {
      return {
        text: scored[0].k.body,
        sources: [scored[0].k.id],
        handoff: false,
      };
    }
  }

  return {
    text: "I don't have a confident answer yet. I've forwarded this to the school inbox.",
    sources: [],
    handoff: true,
    draftForInbox: msg,
  };
}

function overlap(a: string, b: string): number {
  const aw = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 2));
  const bw = b.toLowerCase().split(/\W+/);
  let n = 0;
  for (const w of bw) if (aw.has(w)) n += 1;
  return n;
}
