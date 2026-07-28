"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { PRICING_TIERS } from "@/lib/constants";
import { GlassCard } from "@/components/ui/glass-card";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Pricing() {
  const [seats, setSeats] = useState(25);
  const [automations, setAutomations] = useState(12);

  const estimate = useMemo(() => {
    const base = 7800;
    const seatCost = Math.max(0, seats - 10) * 48;
    const autoCost = Math.max(0, automations - 5) * 180;
    return base + seatCost + autoCost;
  }, [seats, automations]);

  return (
    <section id="pricing" className="relative scroll-mt-24 py-28">
      <div className="glow-orb bottom-0 left-1/4 h-72 w-72 bg-[#4F8CFF]/12" />
      <div className="relative mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Pricing"
          title="Enterprise clarity. Transparent scale."
          description="Choose a foundation. Expand as intelligence becomes your competitive edge."
        />

        <div className="grid gap-5 lg:grid-cols-3">
          {PRICING_TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <GlassCard
                className={cn(
                  "flex h-full flex-col",
                  tier.highlighted &&
                    "ring-1 ring-[#4F8CFF]/40 shadow-[0_0_60px_rgba(79,140,255,0.15)]"
                )}
                glowColor={
                  tier.highlighted
                    ? "rgba(79,140,255,0.3)"
                    : "rgba(255,255,255,0.08)"
                }
                tilt={false}
              >
                {tier.highlighted && (
                  <span className="mb-4 w-fit rounded-full bg-[#4F8CFF]/20 px-3 py-1 text-[10px] tracking-wider text-[#2DD4FF] uppercase">
                    Most chosen
                  </span>
                )}
                <h3 className="font-display text-2xl font-semibold text-white">
                  {tier.name}
                </h3>
                <p className="mt-2 text-sm text-muted">{tier.description}</p>
                <div className="mt-6">
                  {tier.price === null ? (
                    <p className="font-display text-4xl font-semibold text-white">Custom</p>
                  ) : (
                    <p className="font-display text-4xl font-semibold text-white">
                      ${formatNumber(tier.price)}
                      <span className="text-base font-normal text-muted">
                        /{tier.period}
                      </span>
                    </p>
                  )}
                </div>
                <ul className="mt-8 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/75">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2DD4FF]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <MagneticButton
                  href="#final-cta"
                  variant={tier.highlighted ? "primary" : "outline"}
                  className="mt-8 w-full"
                >
                  {tier.cta}
                </MagneticButton>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <GlassCard className="mt-10" tilt={false} glowColor="rgba(45,212,255,0.2)">
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs tracking-[0.25em] text-[#2DD4FF] uppercase">
                Interactive calculator
              </p>
              <h3 className="font-display mt-2 text-2xl font-semibold text-white">
                Estimate your Growth plan
              </h3>
              <div className="mt-8 space-y-6">
                <label className="block">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted">Team seats</span>
                    <span className="text-white">{seats}</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={200}
                    value={seats}
                    onChange={(e) => setSeats(Number(e.target.value))}
                    className="w-full accent-[#4F8CFF]"
                  />
                </label>
                <label className="block">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted">Active automations</span>
                    <span className="text-white">{automations}</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={80}
                    value={automations}
                    onChange={(e) => setAutomations(Number(e.target.value))}
                    className="w-full accent-[#2DD4FF]"
                  />
                </label>
              </div>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-[#4F8CFF]/15 to-[#6E5BFF]/10 p-8 text-center ring-1 ring-white/10">
              <p className="text-xs tracking-wider text-muted uppercase">Estimated monthly</p>
              <p className="font-display mt-2 text-5xl font-semibold text-gradient">
                ${formatNumber(estimate)}
              </p>
              <p className="mt-3 text-sm text-muted">
                Indicative—final pricing reflects deployment model and SLAs.
              </p>
              <MagneticButton href="#final-cta" variant="primary" className="mt-6">
                Get exact quote
              </MagneticButton>
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
