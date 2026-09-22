"use client";

import { PRODUCTS } from "@/lib/constants";
import { Reveal, SectionHeading } from "@/components/ui/reveal";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

function MiniDashboard({ name }: { name: string }) {
  if (name === "Competitor Intelligence") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[
            { k: "New SKUs", v: "+14" },
            { k: "Price Δ", v: "-23%" },
            { k: "OOS", v: "8" },
            { k: "Changes", v: "17" },
          ].map((m) => (
            <div
              key={m.k}
              className="rounded border border-border bg-bg/50 px-2.5 py-2"
            >
              <div className="text-[0.6rem] uppercase tracking-wider text-text-dim">
                {m.k}
              </div>
              <div className="mt-1 font-display text-lg text-accent">{m.v}</div>
            </div>
          ))}
        </div>
        <div className="h-16 rounded border border-border bg-bg/40 p-2">
          <svg viewBox="0 0 200 40" className="h-full w-full">
            <path
              d="M0 28 C20 26, 30 18, 50 20 S80 32, 100 22 140 8, 160 14 190 24, 200 18"
              fill="none"
              stroke="rgba(110,184,224,0.7)"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </div>
    );
  }

  if (name === "AI Sales Assistant") {
    return (
      <div className="space-y-2">
        {["Qualify lead", "Enrich CRM", "Draft follow-up"].map((row, i) => (
          <div
            key={row}
            className="flex items-center justify-between rounded border border-border bg-bg/50 px-3 py-2 text-xs"
          >
            <span className="text-text-muted">{row}</span>
            <span className="text-accent">{i === 2 ? "ready" : "done"}</span>
          </div>
        ))}
      </div>
    );
  }

  if (name === "Support Agent") {
    return (
      <div className="space-y-2">
        <div className="rounded border border-border bg-bg/50 p-3 text-xs text-text-muted">
          Ticket #4821 · Order delay inquiry
        </div>
        <div className="rounded border border-accent/20 bg-accent-soft/40 p-3 text-xs text-text">
          Resolved with policy + shipment data. Escalation skipped.
        </div>
      </div>
    );
  }

  if (name === "Commerce Ops") {
    return (
      <div className="grid grid-cols-3 gap-2 text-center">
        {["Orders", "Pick", "Ship"].map((s, i) => (
          <div
            key={s}
            className="rounded border border-border bg-bg/50 px-2 py-3"
          >
            <div className="font-mono text-[0.6rem] text-text-dim">0{i + 1}</div>
            <div className="mt-1 text-xs text-text">{s}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {["Trigger", "Branch", "Action", "Observe"].map((n) => (
        <div
          key={n}
          className="flex items-center gap-2 rounded border border-border bg-bg/50 px-3 py-2 text-xs text-text-muted"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {n}
        </div>
      ))}
    </div>
  );
}

export function Products() {
  return (
    <section id="products" className="section-pad relative">
      <div className="container-x">
        <SectionHeading
          eyebrow="Products"
          title={
            <>
              We don&apos;t just build automations.
              <br />
              We build products.
            </>
          }
          description="Software you can operate — not one-off scripts that become invisible debt."
        />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {PRODUCTS.map((product, i) => (
            <Reveal key={product.name} delay={i * 0.06}>
              <motion.a
                href={product.href}
                whileHover={{ y: -4 }}
                className="group flex h-full flex-col overflow-hidden rounded-md border border-border bg-bg-elevated transition-colors hover:border-accent/30"
              >
                <div className="border-b border-border bg-surface/60 p-4">
                  <MiniDashboard name={product.name} />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-display text-xl text-text">
                      {product.name}
                    </h3>
                    <span className="rounded border border-border px-2 py-0.5 text-[0.65rem] uppercase tracking-wider text-text-dim">
                      {product.status}
                    </span>
                  </div>
                  <p className="text-xs uppercase tracking-[0.14em] text-text-dim">
                    {product.problem}
                  </p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-text-muted">
                    {product.description}
                  </p>
                  <div className="mt-5 inline-flex items-center gap-1 text-sm text-accent">
                    View product
                    <ArrowUpRight
                      size={14}
                      className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </div>
                </div>
              </motion.a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
