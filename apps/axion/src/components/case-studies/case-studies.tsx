"use client";

import { CASE_STUDIES } from "@/lib/constants";
import { Reveal, SectionHeading } from "@/components/ui/reveal";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CaseStudies() {
  const [active, setActive] = useState(0);
  const study = CASE_STUDIES[active];

  return (
    <section id="work" className="section-pad relative">
      <div className="container-x">
        <SectionHeading
          eyebrow="Work"
          title={
            <>
              Case studies in
              <br />
              systems engineering.
            </>
          }
          description="Examples below are labeled demonstrations — designed to show architecture, not invent customers."
        />

        <Reveal>
          <div className="overflow-hidden rounded-md border border-border bg-bg-elevated">
            <div className="flex flex-col border-b border-border md:flex-row">
              {CASE_STUDIES.map((item, i) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActive(i)}
                  className={cn(
                    "flex-1 border-b border-border px-5 py-4 text-left text-sm transition-colors last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0",
                    active === i
                      ? "bg-accent-soft text-text"
                      : "text-text-muted hover:bg-surface hover:text-text",
                  )}
                >
                  <span className="mb-2 block text-[0.65rem] uppercase tracking-[0.16em] text-text-dim">
                    {item.label}
                  </span>
                  {item.title}
                </button>
              ))}
            </div>

            <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                {(
                  [
                    ["Problem", study.problem],
                    ["System", study.system],
                    ["Automation", study.automation],
                    ["Result", study.result],
                  ] as const
                ).map(([label, body]) => (
                  <div key={label}>
                    <p className="eyebrow mb-2">{label}</p>
                    <p className="text-sm leading-relaxed text-text-muted md:text-[0.95rem]">
                      {body}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-md border border-border bg-surface/40 p-5">
                <p className="eyebrow mb-5">Outcome Signals · Demo</p>
                <div className="grid gap-3">
                  {study.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="flex items-end justify-between border-b border-border pb-3"
                    >
                      <span className="text-sm text-text-muted">{m.label}</span>
                      <span className="font-display text-2xl text-accent">
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 h-24 rounded border border-border bg-bg/50 p-3">
                  <svg viewBox="0 0 240 60" className="h-full w-full">
                    <polyline
                      fill="none"
                      stroke="rgba(110,184,224,0.75)"
                      strokeWidth="1.5"
                      points="0,48 30,44 60,40 90,28 120,30 150,18 180,22 210,10 240,14"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
