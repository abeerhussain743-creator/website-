import Link from "next/link";
import {
  ArrowRight,
  Factory,
  Package,
  Sparkles,
  Workflow,
} from "lucide-react";

const phases = [
  {
    phase: "Phase 1 · MVP",
    items: "Sales · Purchase · Inventory · Production · Basic Accounts",
  },
  {
    phase: "Phase 2",
    items: "BOM · Work Orders · Quality · Warehouse · Costing",
  },
  {
    phase: "Phase 3–4",
    items: "HR · Maintenance · AI Copilot · Predictive alerts",
  },
];

const modules = [
  "CRM & Sales",
  "Purchase",
  "Inventory",
  "Production",
  "Quality",
  "Warehouse",
  "Accounts",
  "Banking",
  "HR",
  "Reports",
  "AI Copilot",
  "Admin",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="display text-2xl font-extrabold text-[var(--steel-deep)]">
          Forge
        </div>
        <div className="flex items-center gap-2">
          <Link href="/app" className="btn btn-secondary hidden sm:inline-flex">
            Open demo
          </Link>
          <Link href="/app" className="btn btn-primary">
            Launch OS
            <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <section className="relative isolate min-h-[calc(100vh-76px)] overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#0a3542_0%,#134e5e_42%,#1a5f6f_70%,#c2410c_160%)]" />
          <div className="absolute inset-0 blueprint-grid opacity-30 mix-blend-soft-light" />
          <div className="hero-sheen" />
          <svg
            className="absolute inset-x-0 bottom-0 h-[55%] w-full opacity-40"
            viewBox="0 0 1200 420"
            fill="none"
            aria-hidden
          >
            <path
              className="flow-path"
              d="M40 320 H220 L300 220 H480 L560 300 H760 L860 160 H1040 L1160 240"
              stroke="rgba(244,247,250,0.55)"
              strokeWidth="2"
            />
            <rect x="180" y="250" width="90" height="70" rx="8" stroke="rgba(244,247,250,0.35)" />
            <rect x="430" y="170" width="110" height="90" rx="8" stroke="rgba(244,247,250,0.35)" />
            <rect x="720" y="230" width="100" height="80" rx="8" stroke="rgba(244,247,250,0.35)" />
            <circle cx="860" cy="160" r="10" fill="rgba(245,158,11,0.85)" className="pulse-line" />
          </svg>
        </div>

        <div className="mx-auto flex max-w-6xl flex-col justify-center px-5 pb-20 pt-16 text-white sm:pt-24">
          <p className="fade-up text-sm font-semibold uppercase tracking-[0.22em] text-white/70">
            Manufacturing OS
          </p>
          <h1 className="display fade-up fade-up-delay-1 mt-3 text-6xl font-extrabold leading-none tracking-tight sm:text-8xl">
            Forge
          </h1>
          <p className="display fade-up fade-up-delay-1 mt-5 max-w-3xl text-2xl font-semibold leading-snug text-white/95 sm:text-3xl">
            The operating system for manufacturing businesses.
          </p>
          <p className="fade-up fade-up-delay-2 mt-5 max-w-xl text-lg text-white/80">
            Connect sales, materials, machines, quality, and cashflow — then let AI surface the
            problems before they hit the floor.
          </p>
          <div className="fade-up fade-up-delay-3 mt-8 flex flex-wrap gap-3">
            <Link
              href="/app"
              className="btn bg-[#f4f7fa] font-bold text-[#0a3542] hover:bg-white"
            >
              Explore live demo
              <ArrowRight size={16} />
            </Link>
            <a href="#blueprint" className="btn border border-white/30 text-white hover:bg-white/10">
              View product blueprint
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20" id="blueprint">
        <div className="max-w-2xl">
          <h2 className="display text-3xl font-bold text-[var(--ink)] sm:text-4xl">
            One loop. Every department.
          </h2>
          <p className="muted mt-3 text-base">
            Forge is built around the manufacturing core — not another generic CRM/ERP with a
            factory skin.
          </p>
        </div>

        <div className="mt-10 overflow-x-auto rounded-[18px] border border-[var(--line)] bg-white/70 p-5 shadow-[var(--shadow)]">
          <div className="flex min-w-[760px] items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--steel)]">
            {[
              "Customer",
              "Sales",
              "Planning",
              "Purchase",
              "Inventory",
              "Manufacture",
              "QC",
              "Warehouse",
              "Invoice",
              "Payment",
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span className="rounded-full bg-[rgba(19,78,94,0.08)] px-3 py-2">{step}</span>
                {i < 9 ? <span className="text-[var(--ink-soft)]">→</span> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Workflow,
              title: "Operational core first",
              body: "Sales → MRP → Purchase → Production → Invoice. Ship the loop before the encyclopedia.",
            },
            {
              icon: Package,
              title: "Inventory as a weapon",
              body: "Raw, WIP, finished, scrap — with reservations, shortages, and auto purchase requests.",
            },
            {
              icon: Sparkles,
              title: "AI that explains P&L",
              body: "Not a chatbot bolted on. A copilot that reads COGS, scrap, and supplier drift.",
            },
          ].map((card) => (
            <div key={card.title} className="panel-flat p-5">
              <card.icon className="text-[var(--steel)]" size={22} />
              <h3 className="display mt-3 text-xl font-semibold">{card.title}</h3>
              <p className="muted mt-2 text-sm leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-[rgba(244,247,250,0.7)] py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="display text-3xl font-bold sm:text-4xl">Twelve modules. Phased delivery.</h2>
              <p className="muted mt-3 max-w-xl">
                Start with metal fabrication workflows, then expand plant-by-plant into a full
                manufacturing OS.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(19,78,94,0.08)] px-4 py-2 text-sm font-semibold text-[var(--steel)]">
              <Factory size={16} />
              Initial segment: metal & component manufacturers
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {modules.map((m) => (
              <span
                key={m}
                className="rounded-full border border-[var(--line)] bg-white/80 px-3 py-1.5 text-sm text-[var(--ink)]"
              >
                {m}
              </span>
            ))}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {phases.map((p) => (
              <div key={p.phase} className="rounded-[16px] border border-[var(--line)] bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--signal)]">
                  {p.phase}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]">{p.items}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="panel overflow-hidden p-0">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-8 sm:p-10">
              <h2 className="display text-3xl font-bold">Pricing built for plants, not seat farms.</h2>
              <p className="muted mt-3 max-w-lg text-sm">
                Manufacturing teams have many workers who need task access — not full-priced ERP seats.
                Plans scale by plant complexity, with AI and integrations as add-ons.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  ["Starter", "$99–149/mo", "Single plant essentials"],
                  ["Growth", "$299–499/mo", "Multi-department ops"],
                  ["Professional", "$799–1,499/mo", "Costing + QC + warehouse"],
                  ["Enterprise", "Custom", "Multi-plant + API + SSO"],
                ].map(([name, price, note]) => (
                  <div key={name} className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                    <p className="text-sm font-semibold">{name}</p>
                    <p className="display mt-1 text-2xl font-bold text-[var(--steel)]">{price}</p>
                    <p className="muted mt-1 text-xs">{note}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[linear-gradient(160deg,#0a3542,#1b5c6d)] p-8 text-white sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                Positioning
              </p>
              <p className="display mt-4 text-3xl font-bold leading-tight">
                An AI-powered operating system for manufacturing businesses.
              </p>
              <p className="mt-4 text-sm text-white/75">
                Not “ERP for everyone.” A focused system that understands BOM shortages, machine
                downtime, scrap, and margin — then tells the owner what to do next.
              </p>
              <Link href="/app" className="btn mt-8 bg-white text-[var(--steel-deep)]">
                Enter the Apex Metalworks demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] px-5 py-8 text-center text-sm text-[var(--ink-soft)]">
        Forge · Product blueprint + interactive Phase 1 demo · Metal fabrication vertical first
      </footer>
    </div>
  );
}
