"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  tilt?: boolean;
}

export function GlassCard({
  children,
  className,
  glowColor = "rgba(79,140,255,0.25)",
  tilt = true,
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const px = useMotionValue(50);
  const py = useMotionValue(50);
  const rotateX = useSpring(rx, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(ry, { stiffness: 200, damping: 20 });
  const glow = useMotionTemplate`radial-gradient(520px circle at ${px}% ${py}%, ${glowColor}, transparent 45%)`;

  const onMove = (e: React.MouseEvent) => {
    if (!tilt || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const midX = rect.width / 2;
    const midY = rect.height / 2;
    ry.set(((x - midX) / midX) * 8);
    rx.set((-(y - midY) / midY) * 8);
    px.set((x / rect.width) * 100);
    py.set((y / rect.height) * 100);
  };

  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX: tilt ? rotateX : 0,
        rotateY: tilt ? rotateY : 0,
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
      className={cn(
        "glass group relative overflow-hidden rounded-3xl p-6 transition-shadow duration-500 hover:shadow-[0_20px_80px_rgba(0,0,0,0.45)]",
        className
      )}
      data-cursor="hover"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: glow }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
