"use client";

import { AutomationCoreLazy } from "@/components/automation-core/lazy";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { Reveal } from "@/components/ui/reveal";

export function FinalCta() {
  return (
    <section id="cta" className="relative overflow-hidden py-28 md:py-36">
      <div className="pointer-events-none absolute inset-0">
        <AutomationCoreLazy
          scrollProgress={0.92}
          interactive={false}
          className="h-full w-full opacity-40"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg via-bg/70 to-bg" />
      <div className="container-x relative z-10 text-center">
        <Reveal>
          <h2 className="headline mx-auto max-w-4xl text-3xl text-text md:text-5xl lg:text-[3.5rem]">
            What should your business
            <br />
            stop doing manually?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-text-muted md:text-lg">
            Tell us what slows your team down. We&apos;ll show you what can be
            automated.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <MagneticButton href="mailto:hello@axion.systems">
              Build My Automation
            </MagneticButton>
            <MagneticButton href="#products" variant="secondary">
              Explore Our Products
            </MagneticButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
