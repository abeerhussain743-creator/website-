"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      className="fixed top-0 right-0 left-0 z-[90] h-[2px] origin-left bg-gradient-to-r from-[#4F8CFF] via-[#2DD4FF] to-[#6E5BFF]"
      style={{ scaleX }}
    />
  );
}
