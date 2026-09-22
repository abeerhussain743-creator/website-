"use client";

import { SERVICES } from "@/lib/constants";
import { Reveal, SectionHeading } from "@/components/ui/reveal";
import {
  Bot,
  Code2,
  GitBranch,
  Phone,
  ShoppingBag,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";

const ICONS: Record<string, LucideIcon> = {
  workflow: Workflow,
  bot: Bot,
  "git-branch": GitBranch,
  phone: Phone,
  code: Code2,
  "shopping-bag": ShoppingBag,
};

export function Services() {
  return (
    <section id="solutions" className="section-pad relative">
      <div className="container-x">
        <SectionHeading
          eyebrow="Solutions"
          title={
            <>
              Systems for every layer
              <br /> of the business.
            </>
          }
          description="Turn repetitive business processes into autonomous systems — agents, workflows, and custom software."
        />

        <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => {
            const Icon = ICONS[service.icon] ?? Workflow;
            return (
              <Reveal key={service.title} delay={i * 0.05}>
                <motion.article
                  whileHover={{ backgroundColor: "rgba(22, 29, 40, 1)" }}
                  className="group relative h-full bg-bg-elevated p-7 transition-colors md:p-8"
                >
                  <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-md border border-border text-accent transition-colors group-hover:border-accent/40 group-hover:bg-accent-soft">
                    <Icon size={18} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display text-xl text-text">
                    {service.title}
                  </h3>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-muted">
                    {service.description}
                  </p>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-accent/50 transition-transform duration-500 group-hover:scale-x-100" />
                </motion.article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
