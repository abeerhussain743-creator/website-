"use client";

import { BUILDER_NODES } from "@/lib/constants";
import { Reveal, SectionHeading } from "@/components/ui/reveal";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AutomationBuilder() {
  const [active, setActive] = useState(0);
  const [running, setRunning] = useState(false);

  function play() {
    setRunning(true);
    setActive(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setActive(i);
      if (i >= BUILDER_NODES.length - 1) {
        window.clearInterval(id);
        setRunning(false);
      }
    }, 550);
  }

  return (
    <section id="builder" className="section-pad relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="container-x relative">
        <SectionHeading
          eyebrow="Automation Builder"
          title={
            <>
              Compose the workflow.
              <br />
              Watch it think.
            </>
          }
          description="A product-grade preview of how Axion turns business events into autonomous execution."
        />

        <Reveal>
          <div className="overflow-hidden rounded-md border border-border bg-bg-elevated">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <p className="text-sm text-text">Order-to-fulfillment workflow</p>
                <p className="text-xs text-text-dim">Simulated canvas · demonstration</p>
              </div>
              <button
                type="button"
                onClick={play}
                disabled={running}
                className="rounded-md border border-accent/40 bg-accent-soft px-4 py-2 text-sm text-accent transition hover:bg-accent/20 disabled:opacity-60"
              >
                {running ? "Running…" : "Run Simulation"}
              </button>
            </div>

            <div className="relative overflow-x-auto p-6 md:p-10">
              <div className="mx-auto flex min-w-[720px] flex-col items-stretch gap-0 md:max-w-2xl">
                {BUILDER_NODES.map((node, i) => (
                  <div key={`${node.type}-${node.label}`}>
                    <motion.div
                      drag
                      dragConstraints={{ left: -12, right: 12, top: -8, bottom: 8 }}
                      dragElastic={0.12}
                      whileDrag={{ scale: 1.02, zIndex: 10 }}
                      animate={{
                        borderColor:
                          i <= active
                            ? "rgba(110,184,224,0.45)"
                            : "rgba(232,237,245,0.08)",
                        boxShadow:
                          i === active
                            ? "0 0 0 1px rgba(110,184,224,0.25), 0 12px 40px -20px rgba(110,184,224,0.55)"
                            : "none",
                      }}
                      className={cn(
                        "cursor-grab rounded-md border bg-surface px-4 py-3 active:cursor-grabbing",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded border border-border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-accent">
                          {node.type}
                        </span>
                        <span className="text-sm text-text">{node.label}</span>
                      </div>
                    </motion.div>
                    {i < BUILDER_NODES.length - 1 ? (
                      <div className="ml-8 flex h-8 items-center">
                        <div
                          className={cn(
                            "h-full w-px",
                            i < active ? "bg-accent" : "bg-border-strong",
                          )}
                        />
                        <motion.div
                          animate={{
                            opacity: i < active ? 1 : 0.25,
                            y: i === active - 1 ? [0, 8, 0] : 0,
                          }}
                          transition={{
                            duration: 0.8,
                            repeat: i === active - 1 ? Infinity : 0,
                          }}
                          className="ml-[-3px] h-1.5 w-1.5 rounded-full bg-accent"
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-5 py-5">
              <p className="max-w-md text-sm text-text-muted">
                Drag nodes to explore the canvas. Run the simulation to see the
                automation path activate.
              </p>
              <MagneticButton href="#cta">Build My Workflow</MagneticButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
