"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { TESTIMONIALS } from "@/lib/constants";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeading } from "@/components/ui/section-heading";

export function Testimonials() {
  return (
    <section id="testimonials" className="relative scroll-mt-24 py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Testimonials"
          title="Trusted by leaders who move first"
          description="Voices from operators who replaced complexity with clarity."
        />

        <div className="grid gap-5 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <GlassCard className="flex h-full flex-col" glowColor="rgba(168,85,247,0.2)">
                <button
                  type="button"
                  className="mb-6 flex h-28 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-white/8 to-transparent ring-1 ring-white/10 transition hover:from-[#4F8CFF]/20"
                  aria-label={`Play video testimonial from ${t.name}`}
                  data-cursor="hover"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                    <Play className="h-4 w-4 fill-white text-white" />
                  </span>
                </button>
                <blockquote className="flex-1 text-base leading-relaxed text-white/85">
                  “{t.quote}”
                </blockquote>
                <div className="mt-6 border-t border-white/8 pt-4">
                  <p className="text-sm font-medium text-white">{t.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {t.role}, {t.company}
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
