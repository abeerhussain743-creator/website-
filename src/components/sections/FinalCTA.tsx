"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { MagneticButton } from "@/components/ui/magnetic-button";

const GlobeScene = dynamic(
  () => import("@/components/three/GlobeScene").then((m) => m.GlobeScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-40 w-40 animate-pulse rounded-full bg-[#2DD4FF]/10 blur-2xl" />
      </div>
    ),
  }
);

export function FinalCTA() {
  return (
    <section id="final-cta" className="relative scroll-mt-24 overflow-hidden py-32">
      <div className="glow-orb top-0 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 bg-[#4F8CFF]/20" />
      <div className="glow-orb right-[10%] bottom-0 h-72 w-72 bg-[#A855F7]/20" />
      <div className="glow-orb bottom-10 left-[15%] h-64 w-64 bg-[#2DD4FF]/15" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <p className="mb-4 text-xs tracking-[0.28em] text-[#2DD4FF] uppercase">
            Next step
          </p>
          <h2 className="font-display text-4xl leading-[1.05] font-semibold tracking-tight text-gradient-soft sm:text-5xl md:text-6xl">
            Let&apos;s Build the Future Together.
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted">
            Tell us where your business needs intelligence. We&apos;ll architect the
            operating system that gets you there.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <MagneticButton href="mailto:hello@aether.ai" variant="primary">
              Book Strategy Call
            </MagneticButton>
            <MagneticButton href="#products" variant="secondary">
              Explore the platform
            </MagneticButton>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="relative mx-auto aspect-square w-full max-w-[480px]"
        >
          <GlobeScene />
        </motion.div>
      </div>
    </section>
  );
}
