"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  type HTMLMotionProps,
} from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

type MagneticButtonProps = HTMLMotionProps<"a"> & {
  variant?: "primary" | "secondary" | "ghost";
  href: string;
};

const variants = {
  primary:
    "bg-accent text-bg hover:bg-accent-strong shadow-[0_0_0_1px_rgba(110,184,224,0.35),0_12px_40px_-12px_rgba(110,184,224,0.55)]",
  secondary:
    "bg-transparent text-text border border-border-strong hover:border-accent/50 hover:bg-accent-soft/40",
  ghost: "bg-transparent text-text-muted hover:text-text",
};

export function MagneticButton({
  children,
  className,
  variant = "primary",
  href,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    x.set(dx * 0.18);
    y.set(dy * 0.18);
  }

  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ x: springX, y: springY }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-medium tracking-tight transition-colors duration-300",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </motion.a>
  );
}
