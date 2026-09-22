"use client";

import { PROCESS_STEPS } from "@/lib/constants";
import { Reveal, SectionHeading } from "@/components/ui/reveal";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section-pad relative">
      <div className="container-x">
        <SectionHeading
          eyebrow="How It Works"
          title={
            <>
              A precise path from
              <br />
              friction to autonomy.
            </>
          }
        />

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PROCESS_STEPS.map((step, i) => (
            <Reveal key={step.number} delay={i * 0.08}>
              <article className="group relative h-full border-t border-border pt-6">
                <div className="font-display text-5xl text-text-dim/40 transition-colors group-hover:text-accent/50 md:text-6xl">
                  {step.number}
                </div>
                <h3 className="mt-6 font-display text-xl uppercase tracking-wide text-text">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">
                  {step.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
