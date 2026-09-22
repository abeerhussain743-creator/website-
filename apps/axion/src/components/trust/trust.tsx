"use client";

import { INTEGRATIONS } from "@/lib/constants";
import { Reveal } from "@/components/ui/reveal";

export function Trust() {
  return (
    <section className="section-pad relative border-y border-border">
      <div className="container-x">
        <Reveal>
          <h2 className="headline mx-auto max-w-3xl text-center text-2xl text-text md:text-4xl">
            Built for businesses that run on systems.
          </h2>
        </Reveal>

        <Reveal delay={0.1} className="mt-12 md:mt-16">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {INTEGRATIONS.map((name) => (
              <div
                key={name}
                className="flex h-20 items-center justify-center bg-bg-elevated px-4 transition-colors hover:bg-surface"
              >
                <span className="font-display text-sm tracking-wide text-text-dim transition-colors hover:text-text-muted">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
