"use client";

import { PROBLEMS } from "@/lib/constants";
import { Reveal, SectionHeading } from "@/components/ui/reveal";
import { motion } from "framer-motion";

const SYSTEMS = ["CRM", "Store", "Inbox", "Sheets", "Support", "Billing"];

export function Problem() {
  return (
    <section className="section-pad relative">
      <div className="container-x">
        <SectionHeading
          eyebrow="The Cost of Manual Work"
          title={
            <>
              Your business shouldn&apos;t depend
              <br className="hidden md:block" /> on manual work.
            </>
          }
          description="Your team shouldn't be the API between your software. Every handoff is latency, error, and lost capacity."
        />

        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <Reveal>
            <ul className="space-y-3">
              {PROBLEMS.map((item, i) => (
                <li
                  key={item}
                  className="group flex items-start gap-4 border-b border-border py-3"
                >
                  <span className="mt-0.5 font-mono text-xs text-text-dim">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[0.95rem] text-text-muted transition-colors group-hover:text-text">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="relative overflow-hidden rounded-md border border-border bg-bg-elevated p-6 md:p-8">
              <p className="eyebrow mb-6">Manual Workflow</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {SYSTEMS.map((sys, i) => (
                  <motion.div
                    key={sys}
                    initial={{ opacity: 0.4 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: i * 0.08 }}
                    className="relative rounded-md border border-border-strong bg-surface px-3 py-4 text-center"
                  >
                    <div className="font-display text-sm text-text">{sys}</div>
                    <div className="mt-2 text-[0.65rem] uppercase tracking-wider text-danger/80">
                      Human in loop
                    </div>
                    {i < SYSTEMS.length - 1 ? (
                      <span className="absolute -right-2 top-1/2 hidden h-px w-4 bg-danger/40 sm:block" />
                    ) : null}
                  </motion.div>
                ))}
              </div>
              <div className="mt-8 border-t border-border pt-6">
                <p className="font-display text-2xl text-text md:text-3xl">
                  We remove the gaps.
                </p>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-text-muted">
                  Axion replaces fragmented handoffs with connected automation —
                  decisions, data movement, and execution in one system.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
