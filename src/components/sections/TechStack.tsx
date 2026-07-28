"use client";

import { motion } from "framer-motion";
import { TECH_STACK } from "@/lib/constants";
import { SectionHeading } from "@/components/ui/section-heading";

export function TechStack() {
  return (
    <section id="technology" className="relative scroll-mt-24 py-28" data-reveal>
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Technology Stack"
          title="The models and infrastructure behind the OS"
          description="Best-in-class foundation models, orchestration, and cloud—composed into one governed system."
        />

        <div className="flex flex-wrap justify-center gap-3 md:gap-4">
          {TECH_STACK.map((tech, i) => (
            <motion.div
              key={tech}
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03, duration: 0.4 }}
              whileHover={{ y: -6, scale: 1.04 }}
              className="glass group animate-float rounded-2xl px-5 py-4"
              style={{ animationDelay: `${(i % 7) * 0.35}s` }}
              data-cursor="hover"
            >
              <span className="font-display text-sm font-medium tracking-wide text-white/75 transition group-hover:text-white">
                {tech}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
