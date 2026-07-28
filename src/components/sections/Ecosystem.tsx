"use client";

import dynamic from "next/dynamic";
import { SectionHeading } from "@/components/ui/section-heading";

const EcosystemScene = dynamic(
  () =>
    import("@/components/three/EcosystemScene").then((m) => m.EcosystemScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] items-center justify-center md:h-[480px]">
        <div className="h-32 w-32 animate-pulse rounded-full bg-[#6E5BFF]/15 blur-2xl" />
      </div>
    ),
  }
);

export function Ecosystem() {
  return (
    <section id="ecosystem" className="relative scroll-mt-24 py-28">
      <div className="glow-orb top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 bg-[#4F8CFF]/10" />
      <div className="relative mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="AI Ecosystem"
          title="Everything connected. Nothing wasted."
          description="Products, agents, and data streams form a living network—intelligence that compounds across every team."
        />
        <div className="glass overflow-hidden rounded-[2rem]">
          <EcosystemScene />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { title: "Unified memory", text: "Shared context across every agent and product." },
            { title: "Live data flow", text: "Signals move instantly between systems of record." },
            { title: "Governed actions", text: "Permissions, audit, and policy at every node." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <h3 className="text-sm font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
