"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeaderNote, SectionCard } from "@/components/ui/Primitives";
import { useForge } from "@/lib/store";

const proactive = [
  "Steel inventory will likely run out in 9 days based on current production.",
  "Supplier Texas Steel Supply increased prices 11% compared with the previous 3 months.",
  "Production Line 2 is 17% less efficient this week.",
  "Customer Northline Automotive has exceeded its normal payment cycle.",
  "Mounting Bracket A margin dropped from 31% → 24% on material inflation.",
];

export default function AiPage() {
  const { data } = useForge();
  const [activeId, setActiveId] = useState(data.aiInsights[0]?.id);

  const active = data.aiInsights.find((i) => i.id === activeId) ?? data.aiInsights[0];

  return (
    <div className="fade-up">
      <TopBar
        title="AI Business Copilot"
        subtitle="Ask why profit moved, where shortages are forming, and which lines are underperforming."
      />
      <PageHeaderNote>
        Phase 4 differentiator · Demo responses are grounded in Apex Metalworks operational data —
        not a generic chatbot.
      </PageHeaderNote>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.3fr]">
        <SectionCard title="Ask Forge">
          <div className="space-y-2">
            {data.aiInsights.map((insight) => (
              <button
                key={insight.id}
                type="button"
                onClick={() => setActiveId(insight.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                  activeId === insight.id
                    ? "border-[var(--steel)] bg-[rgba(19,78,94,0.08)]"
                    : "border-[var(--line)] bg-white/70 hover:border-[var(--steel)]"
                }`}
              >
                {insight.question}
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Insight"
          action={<Sparkles size={16} className="text-[var(--signal)]" />}
        >
          {active ? (
            <div>
              <p className="display text-xl font-semibold">{active.question}</p>
              <p className="mt-4 text-sm leading-relaxed text-[var(--ink)]">{active.answer}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {active.metrics.map((m) => (
                  <div key={m.label} className="rounded-xl bg-[var(--surface-2)] p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">{m.label}</p>
                    <p className="display mt-1 text-2xl font-bold">{m.value}</p>
                    {m.trend ? (
                      <p className="muted mt-1 text-xs capitalize">Trend {m.trend}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </SectionCard>
      </div>

      <SectionCard title="Proactive AI alerts" className="mt-5">
        <div className="grid gap-3 md:grid-cols-2">
          {proactive.map((item) => (
            <div
              key={item}
              className="rounded-xl border border-[rgba(194,65,12,0.2)] bg-[rgba(194,65,12,0.06)] px-4 py-3 text-sm"
            >
              <span className="font-bold text-[var(--signal)]">⚠ </span>
              {item}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
