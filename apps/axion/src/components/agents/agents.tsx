"use client";

import { AGENT_STEPS } from "@/lib/constants";
import { Reveal, SectionHeading } from "@/components/ui/reveal";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function Agents() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((v) => (v + 1) % AGENT_STEPS.length);
    }, 1400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="section-pad relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="container-x relative">
        <SectionHeading
          eyebrow="AI Agents"
          title={
            <>
              Don&apos;t just use AI.
              <br />
              Give it a job.
            </>
          }
          description="Give AI a workflow. Give it a decision. Give it a job — then let it work across your systems."
        />

        <Reveal>
          <div className="overflow-hidden rounded-md border border-border bg-bg-elevated">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-accent" />
                </span>
                <span className="text-sm text-text-muted">
                  Autonomous worker · live simulation
                </span>
              </div>
              <span className="font-mono text-xs text-text-dim">
                agent.runtime.active
              </span>
            </div>

            <div className="grid lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-0 border-b border-border p-5 md:p-8 lg:border-b-0 lg:border-r">
                {AGENT_STEPS.map((step, i) => {
                  const isActive = i === active;
                  const done = i < active;
                  return (
                    <div key={step} className="relative flex gap-4 pb-5 last:pb-0">
                      <div className="flex flex-col items-center">
                        <motion.div
                          animate={{
                            scale: isActive ? 1.15 : 1,
                            backgroundColor: isActive
                              ? "rgba(110,184,224,0.9)"
                              : done
                                ? "rgba(110,184,224,0.35)"
                                : "rgba(92,102,120,0.35)",
                          }}
                          className="h-2.5 w-2.5 rounded-full"
                        />
                        {i < AGENT_STEPS.length - 1 ? (
                          <div className="mt-1 w-px flex-1 bg-border-strong" />
                        ) : null}
                      </div>
                      <div className="pb-2">
                        <p
                          className={`text-sm font-medium ${
                            isActive
                              ? "text-text"
                              : done
                                ? "text-text-muted"
                                : "text-text-dim"
                          }`}
                        >
                          {step}
                        </p>
                        {isActive ? (
                          <motion.div
                            layoutId="agent-pulse"
                            className="mt-2 h-0.5 w-24 rounded-full bg-accent"
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="relative p-5 md:p-8">
                <p className="eyebrow mb-4">Execution Trace</p>
                <div className="space-y-3 font-mono text-xs leading-relaxed text-text-muted">
                  <p>
                    <span className="text-accent">IN</span> message.received ·
                    channel=email
                  </p>
                  <p>
                    <span className="text-accent">AI</span> intent=order_status
                    confidence=0.94
                  </p>
                  <p>
                    <span className="text-accent">GET</span> crm.customer ·
                    id=cus_9182
                  </p>
                  <p>
                    <span className="text-accent">GET</span> inventory.sku ·
                    available=true
                  </p>
                  <p>
                    <span className="text-accent">DECIDE</span> action=notify +
                    update_ticket
                  </p>
                  <p>
                    <span className="text-accent">OUT</span> customer.notified ·
                    systems.synced
                  </p>
                </div>
                <div className="mt-8 rounded-md border border-accent/20 bg-accent-soft/30 p-4">
                  <p className="font-display text-lg text-text">
                    An autonomous worker — not a chatbot demo.
                  </p>
                  <p className="mt-2 text-sm text-text-muted">
                    Context in. Decision out. Systems updated. Customer informed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
