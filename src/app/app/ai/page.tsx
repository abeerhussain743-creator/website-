"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeaderNote, SectionCard } from "@/components/ui/Primitives";
import { useForge } from "@/lib/store";

const prompts = [
  "Why did our profit decrease this month?",
  "Will we run out of steel?",
  "Which line is underperforming?",
  "Where is cash trapped in receivables?",
  "What quality issues need decisions now?",
];

export default function AiPage() {
  const { data, analyze, ask } = useForge();
  const [activeId, setActiveId] = useState(data.aiInsights[0]?.id);
  const [custom, setCustom] = useState("");

  const active = data.aiInsights.find((i) => i.id === activeId) ?? data.aiInsights[0];

  return (
    <div className="fade-up">
      <TopBar
        title="AI Business Copilot"
        subtitle="Live analysis of Apex Metalworks reports — explanations plus decision proposals."
      />
      <PageHeaderNote>
        Phase 3 · Answers are generated from current tenant metrics, inventory, machines, AR, and QC —
        then linked into the <Link href="/app/decisions" className="font-semibold text-[var(--steel)]">Decision Center</Link>.
      </PageHeaderNote>

      <div className="mb-5 flex flex-wrap gap-2">
        <button type="button" className="btn btn-signal" onClick={() => analyze()}>
          <Sparkles size={15} />
          Refresh live analysis
        </button>
        <Link href="/app/decisions" className="btn btn-primary">
          Open Decision Center
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.3fr]">
        <SectionCard title="Ask Forge">
          <div className="space-y-2">
            {prompts.map((question) => (
              <button
                key={question}
                type="button"
                onClick={async () => {
                  await ask(question);
                  setActiveId(
                    question.toLowerCase().includes("profit")
                      ? "live_profit"
                      : question.toLowerCase().includes("steel")
                        ? "live_steel"
                        : question.toLowerCase().includes("line")
                          ? "live_line"
                          : question.toLowerCase().includes("cash")
                            ? "live_ar"
                            : question.toLowerCase().includes("quality")
                              ? "live_qc"
                              : "live_general"
                  );
                }}
                className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3 text-left text-sm transition hover:border-[var(--champagne)]"
              >
                {question}
              </button>
            ))}
          </div>
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!custom.trim()) return;
              await ask(custom.trim());
              setCustom("");
            }}
          >
            <input
              className="flex-1 rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none ring-[var(--champagne)] focus:ring-2"
              placeholder="Ask about margin, stock, QC…"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
            <button type="submit" className="btn btn-primary py-2 text-sm">
              Ask
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Insight" action={<Sparkles size={16} className="text-[var(--signal)]" />}>
          {active ? (
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                {data.aiInsights.map((insight) => (
                  <button
                    key={insight.id}
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      activeId === insight.id
                        ? "bg-[rgba(184,146,90,0.2)] text-[var(--steel)]"
                        : "bg-[var(--surface-2)] text-[var(--ink-soft)]"
                    }`}
                    onClick={() => setActiveId(insight.id)}
                  >
                    {insight.id.replace("live_", "")}
                  </button>
                ))}
              </div>
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
          ) : (
            <p className="muted text-sm">Run live analysis to generate insights.</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
