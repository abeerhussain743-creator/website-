"use client";

import { motion } from "framer-motion";

export function HeroMotion() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-20 top-24 h-64 w-64 rounded-full bg-ember-500/20 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-0 top-10 h-80 w-80 rounded-full bg-ink-400/20 blur-3xl"
        animate={{ x: [0, -30, 0], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-24 left-1/3 h-40 w-[28rem] rounded-full bg-foam-50/5 blur-2xl"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
