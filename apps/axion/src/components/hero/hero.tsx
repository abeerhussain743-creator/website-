"use client";

import { AutomationCoreLazy } from "@/components/automation-core/lazy";
import { MagneticButton } from "@/components/ui/magnetic-button";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef, useState } from "react";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const coreProgress = useTransform(scrollYProgress, [0, 1], [0, 0.45]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);
  const [coreValue, setCoreValue] = useState(0);

  useMotionValueEvent(coreProgress, "change", setCoreValue);

  return (
    <section
      id="top"
      ref={ref}
      className="relative min-h-[115vh] overflow-hidden pt-24 md:min-h-[130vh]"
    >
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-70" />
      <div className="pointer-events-none absolute inset-0 radial-glow" />
      <div className="noise-overlay absolute inset-0" />

      <div className="container-x relative z-10 grid items-center gap-8 pb-24 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:pt-16">
        <motion.div
          style={{ y: textY, opacity: textOpacity }}
          className="relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="mb-7 flex items-center gap-3"
          >
            <span className="relative flex h-8 w-8 items-center justify-center">
              <span className="absolute inset-0 rounded-sm border border-accent/50" />
              <span className="h-2.5 w-2.5 rounded-[1px] bg-accent shadow-[0_0_18px_var(--accent-glow)]" />
            </span>
            <span className="font-display text-2xl font-medium tracking-tight text-text md:text-3xl">
              Axion
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.18 }}
            className="headline text-[2.35rem] text-text sm:text-5xl md:text-6xl lg:text-[4.35rem]"
          >
            We build the systems
            <br className="hidden sm:block" /> that run your business.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.32 }}
            className="mt-6 max-w-xl text-[1.02rem] leading-relaxed text-text-muted md:text-lg"
          >
            We design AI agents, automation systems, and intelligent software
            that eliminate repetitive work and turn complex operations into
            autonomous workflows.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
          >
            <MagneticButton href="#cta" className="w-full justify-center sm:w-auto">
              Build Your Automation
            </MagneticButton>
            <MagneticButton
              href="#products"
              variant="secondary"
              className="w-full justify-center sm:w-auto"
            >
              Explore Our Products
            </MagneticButton>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.65 }}
            className="mt-8 text-xs tracking-[0.14em] text-text-dim sm:tracking-[0.18em]"
          >
            AI Automation · AI Agents · Intelligent Systems · SaaS
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.25 }}
          className="relative h-[340px] sm:h-[460px] lg:h-[560px]"
        >
          <div className="pointer-events-none absolute inset-10 rounded-full bg-accent/10 blur-3xl" />
          <AutomationCoreLazy
            scrollProgress={coreValue}
            className="relative h-full w-full bg-transparent"
          />
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-10 z-10 flex justify-center">
        <div className="flex flex-col items-center gap-2 text-[0.65rem] uppercase tracking-[0.28em] text-text-dim">
          <span>Scroll the system</span>
          <span className="h-10 w-px bg-gradient-to-b from-accent/70 to-transparent" />
        </div>
      </div>
    </section>
  );
}
