"use client";

import {
  Bot,
  Code2,
  Compass,
  Eye,
  Layers,
  MessageSquare,
  Mic,
  Shield,
  Workflow,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { SERVICES } from "@/lib/constants";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeading } from "@/components/ui/section-heading";

const ICONS = {
  zap: Zap,
  compass: Compass,
  code: Code2,
  bot: Bot,
  layers: Layers,
  mic: Mic,
  eye: Eye,
  workflow: Workflow,
  message: MessageSquare,
  shield: Shield,
} as const;

export function Services() {
  return (
    <section id="services" className="relative scroll-mt-24 py-28">
      <div className="glow-orb right-0 bottom-0 h-80 w-80 bg-[#6E5BFF]/15" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid items-end gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading
            align="left"
            eyebrow="AI Services"
            title="Enterprise intelligence, crafted to order"
            description="Strategy, build, and operate—delivered with the discipline of a product company and the precision of a research lab."
            className="mb-0"
          />
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass relative hidden overflow-hidden rounded-[2rem] p-8 lg:block"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#4F8CFF]/15 via-transparent to-[#A855F7]/10" />
            <p className="font-display relative text-3xl leading-tight font-medium text-white">
              Custom systems.
              <br />
              <span className="text-gradient">Measurable outcomes.</span>
            </p>
            <p className="relative mt-4 max-w-sm text-sm text-muted">
              From LLM orchestration to voice and vision pipelines—built for production,
              secured for enterprise, designed to compound.
            </p>
          </motion.div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {SERVICES.map((service, i) => {
            const Icon = ICONS[service.icon as keyof typeof ICONS] ?? Zap;
            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
              >
                <GlassCard className="h-full !p-5" glowColor="rgba(45,212,255,0.2)">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                    <Icon className="h-4 w-4 text-[#2DD4FF]" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">{service.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {service.description}
                  </p>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
