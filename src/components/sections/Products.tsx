"use client";

import { motion } from "framer-motion";
import { PRODUCTS } from "@/lib/constants";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeading } from "@/components/ui/section-heading";

export function Products() {
  return (
    <section id="products" className="relative scroll-mt-24 py-28">
      <div className="glow-orb top-20 left-0 h-72 w-72 bg-[#4F8CFF]/10" />
      <div className="relative mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="AI Products"
          title="Software that thinks with you"
          description="Each product is engineered as a premium system—precise, autonomous, and built to feel inevitable."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((product, i) => (
            <motion.div
              key={product.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-8%" }}
              transition={{ duration: 0.55, delay: i * 0.05 }}
            >
              <GlassCard
                className="h-full min-h-[240px]"
                glowColor={`${product.accent}40`}
              >
                <div className="mb-6 flex items-center justify-between">
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] tracking-wider uppercase"
                    style={{
                      background: `${product.accent}22`,
                      color: product.accent,
                    }}
                  >
                    {product.tag}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-[#2DD4FF]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2DD4FF]" />
                    {product.status}
                  </span>
                </div>
                <h3 className="font-display text-xl font-semibold text-white">
                  {product.name}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {product.description}
                </p>
                <div className="mt-8 border-t border-white/8 pt-4">
                  <p className="text-xs tracking-wide text-white/50 uppercase">
                    Impact
                  </p>
                  <p
                    className="mt-1 font-display text-lg font-medium"
                    style={{ color: product.accent }}
                  >
                    {product.metric}
                  </p>
                </div>
                <div
                  aria-hidden
                  className="mt-5 h-16 rounded-2xl opacity-70"
                  style={{
                    background: `linear-gradient(135deg, ${product.accent}22, transparent 60%), radial-gradient(circle at 70% 40%, ${product.accent}33, transparent 50%)`,
                  }}
                />
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
