import type { BrandContext } from "./schemas.js";
import type { BrandDnaDocument } from "./brand-dna.js";
import type { NichePlaybookDoc } from "./competitors.js";

export type LearningInsights = {
  whatWorked: string[];
  whatDidnt: string[];
  nextWeekChanges: string[];
  provenHooks: string[];
  topFormats: string[];
  topPillars: string[];
};

export function deriveLearningInsights(input: {
  metrics: Array<{
    likes?: number | null;
    saves?: number | null;
    comments?: number | null;
    reach?: number | null;
    format?: string | null;
    pillar?: string | null;
    hook?: string | null;
  }>;
  playbook?: NichePlaybookDoc | null;
}): LearningInsights {
  const scored = input.metrics.map((m) => ({
    ...m,
    score:
      (m.saves ?? 0) * 3 +
      (m.comments ?? 0) * 2 +
      (m.likes ?? 0) +
      Math.round((m.reach ?? 0) / 50),
  }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);
  const bottom = scored.slice(-2);

  const formatCounts = new Map<string, number>();
  const pillarCounts = new Map<string, number>();
  for (const m of top) {
    if (m.format) formatCounts.set(m.format, (formatCounts.get(m.format) ?? 0) + 1);
    if (m.pillar) pillarCounts.set(m.pillar, (pillarCounts.get(m.pillar) ?? 0) + 1);
  }
  const topFormats = [...formatCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([f]) => f);
  const topPillars = [...pillarCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([p]) => p);

  const provenHooks = top
    .map((t) => t.hook)
    .filter((h): h is string => Boolean(h))
    .slice(0, 5);

  const whatWorked = [
    ...(topFormats[0] ? [`${topFormats[0]} posts led saves/engagement`] : []),
    ...(topPillars[0] ? [`Pillar “${topPillars[0]}” outperformed`] : []),
    ...(provenHooks[0] ? [`Hook pattern: “${provenHooks[0].slice(0, 60)}”`] : []),
    ...(input.playbook?.hookPatterns?.slice(0, 1).map((h) => `Playbook hook still working: ${h}`) ??
      []),
  ].slice(0, 4);

  const whatDidnt = [
    ...(bottom[0]?.format ? [`Soft performance on ${bottom[0].format}`] : []),
    "Generic CTAs without a ritual ask",
  ].slice(0, 3);

  const nextWeekChanges = [
    topFormats[0]
      ? `Increase share of ${topFormats[0]} in the mix`
      : "Keep stage-balanced mix",
    topPillars[0]
      ? `Double down on “${topPillars[0]}”`
      : "Rotate pillars evenly",
    "Rewrite underperforming hooks with numbered promises",
  ];

  return {
    whatWorked: whatWorked.length ? whatWorked : ["Build baseline — first week of measured posts"],
    whatDidnt,
    nextWeekChanges,
    provenHooks,
    topFormats,
    topPillars,
  };
}

export function applyLearningToBrandDna(
  dna: BrandDnaDocument,
  learning: LearningInsights,
): BrandDnaDocument {
  return {
    ...dna,
    provenHooks: [
      ...learning.provenHooks,
      ...(Array.isArray(dna.provenHooks) ? (dna.provenHooks as string[]) : []),
    ].slice(0, 12),
  };
}

export type NotifyChannel = "email" | "whatsapp" | "console";

export async function notifyApprovalLink(input: {
  to?: string;
  channel?: NotifyChannel;
  approveUrl: string;
  workspaceName: string;
  weekTitle: string;
}): Promise<{ delivered: boolean; channel: NotifyChannel; detail: string }> {
  const channel: NotifyChannel =
    input.channel ??
    (process.env.WHATSAPP_TOKEN ? "whatsapp" : process.env.RESEND_API_KEY ? "email" : "console");

  if (channel === "email" && process.env.RESEND_API_KEY && input.to) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.AUTH_EMAIL_FROM || "PostPilot <onboarding@localhost>",
          to: input.to,
          subject: `Approve ${input.weekTitle}`,
          html: `<p>Your week for <b>${input.workspaceName}</b> is ready.</p><p><a href="${input.approveUrl}">Review & approve</a></p>`,
        }),
      });
      return {
        delivered: res.ok,
        channel: "email",
        detail: res.ok ? "sent" : `status ${res.status}`,
      };
    } catch (e) {
      return {
        delivered: false,
        channel: "email",
        detail: e instanceof Error ? e.message : "email failed",
      };
    }
  }

  if (channel === "whatsapp" && process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: input.to,
            type: "text",
            text: {
              body: `PostPilot: approve ${input.weekTitle}\n${input.approveUrl}`,
            },
          }),
        },
      );
      return {
        delivered: res.ok,
        channel: "whatsapp",
        detail: res.ok ? "sent" : `status ${res.status}`,
      };
    } catch (e) {
      return {
        delivered: false,
        channel: "whatsapp",
        detail: e instanceof Error ? e.message : "whatsapp failed",
      };
    }
  }

  console.info(
    `[PostPilot] Approval link for ${input.workspaceName}: ${input.approveUrl}`,
  );
  return {
    delivered: true,
    channel: "console",
    detail: input.approveUrl,
  };
}

export function enrichBrandFromDna(
  brand: BrandContext,
  dna: BrandDnaDocument | null | undefined,
): BrandContext & { pillars?: string[] } {
  if (!dna) return brand;
  const pillars = Array.isArray(dna.contentPillars)
    ? (dna.contentPillars as Array<{ name?: string }>)
        .map((p) => p.name)
        .filter((n): n is string => Boolean(n))
    : undefined;
  return { ...brand, pillars };
}
