"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { GlassCard } from "@/components/ui/glass-card";

const TIMELINE = [
  { year: "01", title: "Discover", text: "Map workflows, data, and decision points." },
  { year: "02", title: "Architect", text: "Design the AI operating layer for your org." },
  { year: "03", title: "Deploy", text: "Ship production systems with enterprise controls." },
  { year: "04", title: "Compound", text: "Measure, learn, and expand intelligence continuously." },
];

const STATS = [
  { label: "Enterprise deployments", value: 140, suffix: "+" },
  { label: "Avg. ROI in year one", value: 9.4, suffix: "×", decimals: 1 },
  { label: "Hours automated", value: 2.1, suffix: "M+", decimals: 1 },
  { label: "Uptime commitment", value: 99.99, suffix: "%", decimals: 2 },
];

function AnimatedStat({
  value,
  suffix,
  decimals = 0,
  label,
}: {
  value: number;
  suffix: string;
  decimals?: number;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const duration = 1400;
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value]);

  return (
    <div ref={ref} className="text-center">
      <p className="font-display text-4xl font-semibold tracking-tight text-gradient md:text-5xl">
        {display.toFixed(decimals)}
        {suffix}
      </p>
      <p className="mt-2 text-xs tracking-wide text-muted uppercase">{label}</p>
    </div>
  );
}

export function WhyUs() {
  return (
    <section id="why-us" className="relative scroll-mt-24 py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Why Aether"
          title="Built like infrastructure. Felt like magic."
          description="An operating system for modern businesses—secure, adaptive, and designed to outpace every competitor."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <GlassCard key={s.label} tilt={false} className="!py-8">
              <AnimatedStat {...s} />
            </GlassCard>
          ))}
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {TIMELINE.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass flex gap-4 rounded-2xl p-5"
              >
                <span className="font-display text-2xl font-semibold text-[#4F8CFF]/70">
                  {item.year}
                </span>
                <div>
                  <h3 className="font-medium text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted">{item.text}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <GlassCard className="min-h-[360px]" glowColor="rgba(110,91,255,0.25)">
            <p className="text-xs tracking-[0.25em] text-[#2DD4FF] uppercase">
              Enterprise architecture
            </p>
            <h3 className="font-display mt-3 text-2xl font-semibold text-white">
              Secure intelligence fabric
            </h3>
            <div className="mt-8 space-y-3">
              {[
                { label: "Experience Layer", w: "92%" },
                { label: "Agent Orchestration", w: "78%" },
                { label: "Model Gateway", w: "86%" },
                { label: "Data & Memory", w: "70%" },
                { label: "Security & Governance", w: "96%" },
              ].map((row, i) => (
                <div key={row.label}>
                  <div className="mb-1.5 flex justify-between text-xs text-muted">
                    <span>{row.label}</span>
                    <span>{row.w}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: row.w }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.15 * i, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full bg-gradient-to-r from-[#4F8CFF] via-[#2DD4FF] to-[#6E5BFF]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
