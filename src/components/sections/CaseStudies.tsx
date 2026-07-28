"use client";

import { motion } from "framer-motion";
import { CASE_STUDIES } from "@/lib/constants";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeading } from "@/components/ui/section-heading";

export function CaseStudies() {
  return (
    <section id="case-studies" className="relative scroll-mt-24 py-28">
      <div className="glow-orb top-10 right-10 h-72 w-72 bg-[#2DD4FF]/10" />
      <div className="relative mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Featured Case Studies"
          title="Proof, not promises"
          description="Outcomes from organizations that replaced fragmented tools with an AI operating system."
        />

        <div className="space-y-6">
          {CASE_STUDIES.map((study, i) => (
            <motion.div
              key={study.company}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
            >
              <GlassCard
                className="overflow-hidden !p-0"
                glowColor="rgba(79,140,255,0.22)"
                tilt={false}
              >
                <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="p-8 md:p-10">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs tracking-[0.2em] text-[#2DD4FF] uppercase">
                        {study.industry}
                      </span>
                      <span className="text-white/30">·</span>
                      <span className="text-xs text-muted">{study.company}</span>
                    </div>
                    <h3 className="font-display mt-4 max-w-md text-2xl font-semibold text-white md:text-3xl">
                      {study.title}
                    </h3>

                    <div className="mt-8 grid max-w-md grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-white/3 p-4 ring-1 ring-white/8">
                        <p className="text-[10px] tracking-wider text-muted uppercase">
                          Before
                        </p>
                        <p className="mt-2 text-sm text-white/70">{study.before}</p>
                      </div>
                      <div className="rounded-2xl bg-[#4F8CFF]/10 p-4 ring-1 ring-[#4F8CFF]/25">
                        <p className="text-[10px] tracking-wider text-[#2DD4FF] uppercase">
                          After
                        </p>
                        <p className="mt-2 text-sm text-white">{study.after}</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative border-t border-white/8 bg-gradient-to-br from-[#0A1628]/80 to-transparent p-8 md:border-t-0 md:border-l lg:p-10">
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-40"
                      style={{
                        background:
                          "radial-gradient(circle at 70% 30%, rgba(79,140,255,0.25), transparent 50%), linear-gradient(180deg, transparent, rgba(6,7,10,0.4))",
                      }}
                    />
                    <div className="relative grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
                      {study.metrics.map((m) => (
                        <div key={m.label}>
                          <p className="font-display text-3xl font-semibold text-gradient md:text-4xl">
                            {m.value}
                          </p>
                          <p className="mt-1 text-xs tracking-wide text-muted uppercase">
                            {m.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
