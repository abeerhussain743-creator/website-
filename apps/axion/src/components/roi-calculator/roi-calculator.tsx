"use client";

import { Reveal, SectionHeading, AnimatedNumber } from "@/components/ui/reveal";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { formatCurrency } from "@/lib/utils";
import { useMemo, useState } from "react";

export function RoiCalculator() {
  const [employees, setEmployees] = useState(12);
  const [hours, setHours] = useState(10);
  const [cost, setCost] = useState(45);
  const [volume, setVolume] = useState(800);

  const results = useMemo(() => {
    const automationRate = 0.55;
    const monthlyHours = employees * hours * 4.33 * automationRate;
    const annualHours = monthlyHours * 12;
    const monthlyCost = monthlyHours * cost;
    const annualCost = monthlyCost * 12;
    const volumeLift = Math.round(volume * automationRate);
    return { monthlyHours, annualHours, monthlyCost, annualCost, volumeLift };
  }, [employees, hours, cost, volume]);

  return (
    <section id="roi" className="section-pad relative">
      <div className="container-x">
        <SectionHeading
          eyebrow="Business Impact"
          title={
            <>
              Estimate the cost of
              <br />
              staying manual.
            </>
          }
          description="A directional model — not a promise. Use it to frame the conversation about automation potential."
        />

        <Reveal>
          <div className="grid overflow-hidden rounded-md border border-border lg:grid-cols-[1fr_1fr]">
            <div className="space-y-6 border-b border-border bg-bg-elevated p-6 md:p-8 lg:border-b-0 lg:border-r">
              <Field
                label="Employees in scope"
                value={employees}
                min={1}
                max={200}
                onChange={setEmployees}
              />
              <Field
                label="Hours spent weekly on repetitive work"
                value={hours}
                min={1}
                max={40}
                onChange={setHours}
              />
              <Field
                label="Average hourly cost ($)"
                value={cost}
                min={15}
                max={200}
                onChange={setCost}
              />
              <Field
                label="Monthly task volume"
                value={volume}
                min={50}
                max={20000}
                step={50}
                onChange={setVolume}
              />
            </div>

            <div className="bg-surface/30 p-6 md:p-8">
              <p className="eyebrow mb-6">Estimated Impact</p>
              <div className="space-y-5">
                <Result
                  label="Monthly hours saved"
                  value={
                    <AnimatedNumber
                      key={`mh-${Math.round(results.monthlyHours)}`}
                      value={Math.round(results.monthlyHours)}
                    />
                  }
                />
                <Result
                  label="Annual hours saved"
                  value={
                    <AnimatedNumber
                      key={`ah-${Math.round(results.annualHours)}`}
                      value={Math.round(results.annualHours)}
                    />
                  }
                />
                <Result
                  label="Potential annual cost reduction"
                  value={
                    <span className="text-accent">
                      {formatCurrency(results.annualCost)}
                    </span>
                  }
                />
                <Result
                  label="Tasks addressable monthly"
                  value={
                    <AnimatedNumber
                      key={`tv-${results.volumeLift}`}
                      value={results.volumeLift}
                    />
                  }
                />
              </div>

              <p className="mt-8 text-xs leading-relaxed text-text-dim">
                Disclaimer: figures are illustrative estimates based on your
                inputs and a conservative automation assumption. Actual results
                depend on process design, data quality, and integration scope.
              </p>

              <div className="mt-6">
                <MagneticButton href="#cta">
                  Let&apos;s Calculate Your Automation Potential
                </MagneticButton>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm text-text-muted">{label}</span>
        <span className="font-mono text-sm text-text">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </label>
  );
}

function Result({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-b border-border pb-4">
      <div className="text-xs uppercase tracking-[0.16em] text-text-dim">
        {label}
      </div>
      <div className="mt-2 font-display text-3xl text-text">{value}</div>
    </div>
  );
}
