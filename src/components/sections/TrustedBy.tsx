"use client";

import { TRUSTED_BY } from "@/lib/constants";

export function TrustedBy() {
  const logos = [...TRUSTED_BY, ...TRUSTED_BY];

  return (
    <section className="relative border-y border-white/5 py-14" aria-label="Trusted by">
      <div className="mx-auto mb-8 max-w-6xl px-6 text-center">
        <p className="text-xs tracking-[0.28em] text-muted uppercase">
          Trusted by forward-looking enterprises
        </p>
      </div>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#06070A] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#06070A] to-transparent" />
        <div className="marquee-track gap-12 px-6">
          {logos.map((name, i) => (
            <div
              key={`${name}-${i}`}
              className="flex min-w-[160px] items-center justify-center"
            >
              <span className="font-display text-xl font-semibold tracking-tight text-white/35 transition hover:text-white/70 sm:text-2xl">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
