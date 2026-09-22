"use client";

import { INDUSTRIES } from "@/lib/constants";
import { Reveal, SectionHeading } from "@/components/ui/reveal";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export function Industries() {
  const [active, setActive] = useState(0);
  const industry = INDUSTRIES[active];

  return (
    <section id="industries" className="section-pad relative">
      <div className="container-x">
        <SectionHeading
          eyebrow="Industries"
          title={
            <>
              Same intelligence.
              <br />
              Different operating maps.
            </>
          }
          description="Hover an industry to see how work flows when systems — not people — connect each step."
        />

        <Reveal>
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
              {INDUSTRIES.map((item, i) => (
                <button
                  key={item.name}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  className={`rounded-md border px-4 py-4 text-left text-sm transition-colors ${
                    active === i
                      ? "border-accent/40 bg-accent-soft text-text"
                      : "border-border bg-bg-elevated text-text-muted hover:border-border-strong hover:text-text"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>

            <div className="relative min-h-[280px] overflow-hidden rounded-md border border-border bg-bg-elevated p-6 md:p-8">
              <p className="eyebrow mb-6">Workflow · {industry.name}</p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={industry.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="flex flex-wrap items-center gap-2 md:gap-3"
                >
                  {industry.flow.map((node, i) => (
                    <div key={node} className="flex items-center gap-2 md:gap-3">
                      <div className="rounded-md border border-accent/25 bg-accent-soft/40 px-3 py-2 text-sm text-text">
                        {node}
                      </div>
                      {i < industry.flow.length - 1 ? (
                        <span className="h-px w-5 bg-accent/50 md:w-8" />
                      ) : null}
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
              <p className="mt-10 max-w-md text-sm leading-relaxed text-text-muted">
                Build systems that work while your team works on the business —
                not on the gaps between tools.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
