"use client";

import { Reveal } from "@/components/ui/reveal";

const PILLARS = ["AI", "Automation", "Software", "Data", "Business strategy"];

export function About() {
  return (
    <section id="about" className="section-pad relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(110,184,224,0.07),transparent_55%)]" />
      <div className="container-x relative">
        <Reveal>
          <p className="eyebrow mb-6">Philosophy</p>
          <h2 className="headline max-w-4xl text-3xl text-text md:text-5xl lg:text-[3.4rem]">
            The future of business isn&apos;t more people doing more tasks.
            <span className="mt-3 block text-text-muted">
              It&apos;s better systems doing more work.
            </span>
          </h2>
        </Reveal>

        <Reveal delay={0.12} className="mt-10 max-w-2xl">
          <p className="text-base leading-relaxed text-text-muted md:text-lg">
            Axion combines AI, automation, software, data, and business strategy
            into intelligent systems — infrastructure that removes repetitive
            work and compounds operational advantage.
          </p>
        </Reveal>

        <Reveal delay={0.2} className="mt-12">
          <div className="flex flex-wrap gap-3">
            {PILLARS.map((pillar) => (
              <span
                key={pillar}
                className="rounded-md border border-border bg-bg-elevated px-4 py-2 text-sm text-text-muted"
              >
                {pillar}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
