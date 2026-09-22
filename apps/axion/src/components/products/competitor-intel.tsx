"use client";

import { COMPETITOR_PIPELINE } from "@/lib/constants";
import { Reveal, SectionHeading, AnimatedNumber } from "@/components/ui/reveal";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { motion } from "framer-motion";
import { useState } from "react";

export function CompetitorIntel() {
  const [url, setUrl] = useState("https://competitor.example/store");
  const [scanning, setScanning] = useState(false);
  const [step, setStep] = useState(0);

  function runScan(e: React.FormEvent) {
    e.preventDefault();
    setScanning(true);
    setStep(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setStep(i);
      if (i >= COMPETITOR_PIPELINE.length) {
        window.clearInterval(id);
        setScanning(false);
      }
    }, 420);
  }

  return (
    <section id="competitor-intel" className="section-pad relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(110,184,224,0.08),transparent_50%)]" />
      <div className="container-x relative">
        <SectionHeading
          eyebrow="Featured Product"
          title={
            <>
              Competitor Intelligence
              <br /> as an operating system.
            </>
          }
          description="Enter a storefront. Discover products. Track prices and inventory. Detect change. Alert the business."
        />

        <Reveal>
          <div className="overflow-hidden rounded-md border border-border bg-bg-elevated">
            <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
              <div className="border-b border-border p-6 md:p-8 lg:border-b-0 lg:border-r">
                <form onSubmit={runScan} className="space-y-4">
                  <label className="block text-xs uppercase tracking-[0.16em] text-text-dim">
                    Competitor store URL
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full rounded-md border border-border-strong bg-bg px-4 py-3 text-sm text-text outline-none ring-accent/40 placeholder:text-text-dim focus:ring-2"
                      placeholder="https://..."
                    />
                    <button
                      type="submit"
                      className="rounded-md bg-accent px-5 py-3 text-sm font-medium text-bg transition hover:bg-accent-strong"
                    >
                      {scanning ? "Scanning…" : "Scan Store"}
                    </button>
                  </div>
                </form>

                <ol className="mt-8 space-y-2">
                  {COMPETITOR_PIPELINE.map((item, i) => (
                    <li
                      key={item}
                      className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors ${
                        i < step
                          ? "border-accent/30 bg-accent-soft/40 text-text"
                          : i === step && scanning
                            ? "border-accent/50 bg-accent-soft text-text"
                            : "border-border text-text-dim"
                      }`}
                    >
                      <span className="font-mono text-[0.65rem]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="p-6 md:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <p className="eyebrow">Live Dashboard · Demo</p>
                  <span className="rounded border border-border px-2 py-1 text-[0.65rem] uppercase tracking-wider text-text-dim">
                    Demonstration
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Metric
                    label="New Products"
                    prefix="+"
                    value={14}
                    hint="7d discovery window"
                  />
                  <Metric
                    label="Price Change"
                    prefix=""
                    value={-23}
                    suffix="%"
                    hint="avg. on tracked set"
                  />
                  <Metric
                    label="Out of Stock"
                    value={8}
                    hint="competitor SKUs"
                  />
                  <Metric
                    label="Competitor Changes"
                    value={17}
                    hint="last 24 hours"
                  />
                </div>

                <div className="mt-6 rounded-md border border-border bg-surface/50 p-4">
                  <div className="mb-3 flex items-center justify-between text-xs text-text-dim">
                    <span>Price trajectory · tracked catalog</span>
                    <span className="text-accent">demo data</span>
                  </div>
                  <svg viewBox="0 0 400 120" className="h-28 w-full">
                    <defs>
                      <linearGradient id="ciFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(110,184,224,0.35)" />
                        <stop offset="100%" stopColor="rgba(110,184,224,0)" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 80 C40 76, 70 60, 110 62 S170 90, 210 70 280 30, 320 42 370 70, 400 55 L400 120 L0 120 Z"
                      fill="url(#ciFill)"
                    />
                    <path
                      d="M0 80 C40 76, 70 60, 110 62 S170 90, 210 70 280 30, 320 42 370 70, 400 55"
                      fill="none"
                      stroke="#6eb8e0"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                <div className="mt-6">
                  <MagneticButton href="#cta" variant="secondary">
                    Request Product Access
                  </MagneticButton>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  prefix = "",
  suffix = "",
  hint,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  hint: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-md border border-border bg-surface/40 p-4"
    >
      <div className="text-[0.65rem] uppercase tracking-[0.16em] text-text-dim">
        {label}
      </div>
      <div className="mt-2 font-display text-3xl text-text">
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
      </div>
      <div className="mt-1 text-xs text-text-muted">{hint}</div>
    </motion.div>
  );
}
