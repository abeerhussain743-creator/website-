"use client";

import { AUTONOMOUS_FLOW, MANUAL_FLOW } from "@/lib/constants";
import { Reveal, SectionHeading } from "@/components/ui/reveal";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

function FlowColumn({
  title,
  steps,
  tone,
  progress,
}: {
  title: string;
  steps: readonly string[];
  tone: "manual" | "auto";
  progress: number;
}) {
  return (
    <div
      className={cn(
        "relative rounded-md border p-5 md:p-7",
        tone === "manual"
          ? "border-border bg-bg-elevated"
          : "border-accent/25 bg-accent-soft/20",
      )}
    >
      <div className="mb-6 flex items-center justify-between">
        <p className="eyebrow">{title}</p>
        <span
          className={cn(
            "text-[0.65rem] uppercase tracking-[0.18em]",
            tone === "manual" ? "text-danger/80" : "text-accent",
          )}
        >
          {tone === "manual" ? "Fragile" : "Reliable"}
        </span>
      </div>
      <ol>
        {steps.map((step, i) => {
          const active = tone === "manual" ? progress < 0.45 : progress > 0.35;
          const isHuman = step === "Human";
          return (
            <li key={`${title}-${step}-${i}`} className="relative pl-1">
              <motion.div
                animate={{
                  opacity: active ? 1 : 0.35,
                  x:
                    tone === "manual" && progress > 0.5
                      ? -4
                      : 0,
                }}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-3 py-2.5",
                  isHuman
                    ? "border-danger/30 bg-danger/5 text-danger"
                    : tone === "auto"
                      ? "border-accent/20 bg-bg/60 text-text"
                      : "border-border bg-surface text-text-muted",
                )}
              >
                <span className="font-mono text-[0.65rem] text-text-dim">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-medium">{step}</span>
              </motion.div>
              {i < steps.length - 1 ? (
                <div
                  className={cn(
                    "ml-6 h-4 w-px",
                    tone === "auto" ? "bg-accent/40" : "bg-border-strong",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function Transform() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const progressValue = useTransform(scrollYProgress, [0.2, 0.7], [0, 1]);
  const [p, setP] = useState(0);
  useMotionValueEvent(progressValue, "change", setP);

  return (
    <section ref={ref} className="section-pad relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(110,184,224,0.06),transparent_60%)]" />
      <div className="container-x relative">
        <SectionHeading
          eyebrow="Automation Transform"
          title={
            <>
              From human glue
              <br /> to autonomous flow.
            </>
          }
          description="Watch the operating model change: fewer handoffs, clearer decisions, continuous execution."
        />

        <Reveal>
          <div className="grid gap-6 lg:grid-cols-2">
            <FlowColumn
              title="Manual"
              steps={MANUAL_FLOW}
              tone="manual"
              progress={p}
            />
            <FlowColumn
              title="Autonomous"
              steps={AUTONOMOUS_FLOW}
              tone="auto"
              progress={p}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
