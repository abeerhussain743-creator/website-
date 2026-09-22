"use client";

import { COMPANY } from "@/lib/constants";

function IconX(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  );
}

function IconLinkedIn(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M8 11v8M8 8v.01M12 19v-5.5a2.5 2.5 0 115 0V19M4 4h16v16H4z" />
    </svg>
  );
}

function IconGit(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <path d="M6 8v4a4 4 0 004 4h0a4 4 0 004-4V8" />
    </svg>
  );
}

const FOOTER_COLS = [
  {
    title: "Solutions",
    links: [
      { label: "AI Automation", href: "#solutions" },
      { label: "AI Agents", href: "#solutions" },
      { label: "Workflows", href: "#solutions" },
      { label: "Voice Agents", href: "#solutions" },
    ],
  },
  {
    title: "Products",
    links: [
      { label: "Competitor Intelligence", href: "#competitor-intel" },
      { label: "Sales Assistant", href: "#products" },
      { label: "Support Agent", href: "#products" },
      { label: "Workflow Platform", href: "#builder" },
    ],
  },
  {
    title: "Industries",
    links: [
      { label: "E-commerce", href: "#industries" },
      { label: "SaaS", href: "#industries" },
      { label: "Professional Services", href: "#industries" },
      { label: "Manufacturing", href: "#industries" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#about" },
      { label: "Work", href: "#work" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Contact", href: "mailto:hello@axion.systems" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <div className="container-x section-pad !py-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_2fr]">
          <div>
            <a href="#top" className="inline-flex items-center gap-2.5">
              <span className="relative flex h-7 w-7 items-center justify-center">
                <span className="absolute inset-0 rounded-sm border border-accent/40" />
                <span className="h-2 w-2 rounded-[1px] bg-accent" />
              </span>
              <span className="font-display text-lg text-text">{COMPANY.name}</span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-text-muted">
              {COMPANY.tagline}
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[
                { Icon: IconX, label: "X" },
                { Icon: IconLinkedIn, label: "LinkedIn" },
                { Icon: IconGit, label: "GitHub" },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#top"
                  aria-label={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-text-dim transition hover:border-accent/40 hover:text-text"
                >
                  <Icon width={15} height={15} />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {FOOTER_COLS.map((col) => (
              <div key={col.title}>
                <p className="mb-4 text-xs uppercase tracking-[0.18em] text-text-dim">
                  {col.title}
                </p>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-text-muted transition hover:text-text"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-border pt-6 text-xs text-text-dim sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {COMPANY.name}. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#top" className="hover:text-text-muted">
              Privacy
            </a>
            <a href="#top" className="hover:text-text-muted">
              Terms
            </a>
            <a href="mailto:hello@axion.systems" className="hover:text-text-muted">
              {COMPANY.email}
            </a>
          </div>
        </div>

        <div className="mt-8 hidden gap-2 opacity-30 md:grid md:grid-cols-12">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-px bg-accent/40" />
          ))}
        </div>
      </div>
    </footer>
  );
}
