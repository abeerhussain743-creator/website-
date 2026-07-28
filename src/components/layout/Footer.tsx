"use client";

import { SITE } from "@/lib/constants";
import { MagneticButton } from "@/components/ui/magnetic-button";

const COLUMNS = [
  {
    title: "Product",
    links: ["AI CRM", "Sales Agent", "Voice AI", "Workflows", "Analytics"],
  },
  {
    title: "Services",
    links: ["Consulting", "Custom Agents", "LLM Integration", "Enterprise AI"],
  },
  {
    title: "Resources",
    links: ["Case Studies", "Documentation", "Security", "API Status"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Newsroom", "Contact"],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/8 pt-24 pb-10">
      <div className="glow-orb top-0 left-1/2 h-64 w-[40rem] -translate-x-1/2 bg-[#4F8CFF]/15" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <p className="font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
              {SITE.name}
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              {SITE.tagline}
            </p>
            <form
              className="mt-8 flex max-w-md gap-2"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                required
                placeholder="Work email"
                className="glass flex-1 rounded-full px-4 py-3 text-sm outline-none placeholder:text-muted-dim focus:border-[#4F8CFF]/40"
                aria-label="Email for newsletter"
              />
              <MagneticButton type="submit" variant="primary" className="!px-5 !py-3 text-xs">
                Subscribe
              </MagneticButton>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="mb-4 text-xs tracking-[0.2em] text-muted uppercase">
                  {col.title}
                </p>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-white/70 transition hover:text-white"
                        data-cursor="hover"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/8 pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-dim">
            © {new Date().getFullYear()} {SITE.name} Inc. All rights reserved.
          </p>
          <div className="flex gap-5 text-xs text-muted">
            <a href="#" className="hover:text-white">
              Privacy
            </a>
            <a href="#" className="hover:text-white">
              Terms
            </a>
            <a href="#" className="hover:text-white">
              Security
            </a>
            <a href="https://x.com" className="hover:text-white">
              X
            </a>
            <a href="https://linkedin.com" className="hover:text-white">
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
