"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  variant?: Variant;
  magneticStrength?: number;
  href?: string;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-[#4F8CFF] via-[#2DD4FF] to-[#6E5BFF] text-white shadow-[0_0_40px_rgba(79,140,255,0.35)] hover:shadow-[0_0_60px_rgba(45,212,255,0.45)]",
  secondary:
    "glass-strong text-white hover:border-white/25 hover:bg-white/10",
  ghost: "text-white/80 hover:text-white hover:bg-white/5",
  outline:
    "border border-white/15 bg-transparent text-white hover:border-[#2DD4FF]/50 hover:bg-[#2DD4FF]/5",
};

export function MagneticButton({
  children,
  className,
  variant = "primary",
  magneticStrength = 0.35,
  href,
  type = "button",
  onClick,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 280, damping: 20 });
  const y = useSpring(my, { stiffness: 280, damping: 20 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    mx.set(dx * magneticStrength);
    my.set(dy * magneticStrength);
  };

  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const classes = cn(
    "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-sm font-medium tracking-wide transition-shadow duration-300 will-change-transform",
    variants[variant],
    className
  );

  const content = (
    <>
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      {variant === "primary" && (
        <span
          aria-hidden
          className="animate-gradient absolute inset-0 bg-gradient-to-r from-[#4F8CFF] via-[#2DD4FF] to-[#6E5BFF] opacity-80"
        />
      )}
    </>
  );

  if (href) {
    return (
      <motion.a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        style={{ x, y }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onClick={onClick}
        className={classes}
        data-cursor="hover"
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      ref={ref as React.RefObject<HTMLButtonElement>}
      type={type}
      style={{ x, y }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={classes}
      data-cursor="hover"
    >
      {content}
    </motion.button>
  );
}
