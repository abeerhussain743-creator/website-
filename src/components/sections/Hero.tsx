"use client";

import dynamic from "next/dynamic";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Play } from "lucide-react";
import { SITE } from "@/lib/constants";
import { MagneticButton } from "@/components/ui/magnetic-button";

const HeroScene = dynamic(
  () => import("@/components/three/HeroScene").then((m) => m.HeroScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-56 w-56 animate-pulse rounded-full bg-[#4F8CFF]/10 blur-3xl" />
      </div>
    ),
  }
);

export function Hero() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 40, damping: 20 });
  const sy = useSpring(my, { stiffness: 40, damping: 20 });
  const orbX = useTransform(sx, [-1, 1], [-40, 40]);
  const orbY = useTransform(sy, [-1, 1], [-28, 28]);
  const orbXInv = useTransform(orbX, (v) => -v);
  const orbYInv = useTransform(orbY, (v) => -v);

  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] items-end overflow-hidden pb-24 pt-28 md:items-center md:pb-16"
      onMouseMove={(e) => {
        mx.set((e.clientX / window.innerWidth - 0.5) * 2);
        my.set((e.clientY / window.innerHeight - 0.5) * 2);
      }}
    >
      {/* Full-bleed 3D plane */}
      <div className="pointer-events-none absolute inset-0 md:pointer-events-auto">
        <div className="absolute inset-0 bg-gradient-to-b from-[#06070A] via-transparent to-[#06070A] md:bg-gradient-to-r md:from-[#06070A] md:via-[#06070A]/55 md:to-transparent" />
        <div className="absolute inset-0 md:left-[28%]">
          <HeroScene />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#06070A] to-transparent md:hidden" />
      </div>

      <div className="grid-fade pointer-events-none absolute inset-0 opacity-40" />
      <motion.div
        aria-hidden
        style={{ x: orbX, y: orbY }}
        className="glow-orb top-[-8%] left-[5%] h-[30rem] w-[30rem] bg-[#4F8CFF]/22"
      />
      <motion.div
        aria-hidden
        style={{ x: orbXInv, y: orbYInv }}
        className="glow-orb right-[8%] bottom-[5%] h-[24rem] w-[24rem] bg-[#6E5BFF]/18"
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
        <div className="max-w-xl lg:max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display mb-5 text-6xl font-semibold tracking-tight text-white sm:text-7xl md:text-8xl"
          >
            {SITE.name}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display text-3xl leading-[1.08] font-medium tracking-tight text-gradient sm:text-4xl md:text-5xl lg:text-[3.4rem]"
          >
            The Future of AI Starts Here.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-6 max-w-md text-base leading-relaxed text-muted sm:text-lg"
          >
            We build intelligent AI products and enterprise automation systems that
            transform how modern businesses operate.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <MagneticButton href="#final-cta" variant="primary">
              Book Strategy Call
            </MagneticButton>
            <MagneticButton href="#products" variant="secondary">
              Explore Products
            </MagneticButton>
            <MagneticButton href="#case-studies" variant="ghost" className="!px-4">
              <Play className="h-4 w-4 fill-current" />
              Watch Demo
            </MagneticButton>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
      >
        <span className="text-[10px] tracking-[0.3em] text-muted uppercase">Scroll</span>
        <span className="h-10 w-px overflow-hidden bg-white/10">
          <motion.span
            className="block h-full w-full bg-gradient-to-b from-[#2DD4FF] to-transparent"
            animate={{ y: ["-100%", "100%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </motion.div>
    </section>
  );
}
