import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Radar, FileCheck2 } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="font-display text-2xl font-700">DealFlow <span className="text-teal-700">AI</span></div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Start free
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden hero-grid">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(15,118,110,0.18),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(216,195,165,0.35),transparent_35%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-20 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:pt-16">
          <div className="animate-rise">
            <div className="font-display text-5xl leading-[0.95] font-800 tracking-tight sm:text-6xl lg:text-7xl">
              DealFlow <span className="text-teal-700">AI</span>
            </div>
            <p className="mt-5 max-w-xl text-lg text-[var(--color-ink-soft)]">
              Turn every sales call into a ready-to-send proposal.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-ink)] px-5 py-3 text-white hover:bg-black"
              >
                Launch workspace <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white/80 px-5 py-3 hover:bg-white"
              >
                View demo
              </Link>
            </div>
          </div>

          <div className="glass-panel animate-rise-delay-1 rounded-[28px] p-5 sm:p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-teal-800/70">Live pipeline</div>
            <div className="mt-3 font-display text-3xl">$84,500</div>
            <div className="mt-4 space-y-3">
              {[
                ['Acme Corp', 'Proposal Ready'],
                ['Nova Fitness', 'AI Processing'],
                ['Bright Dental', 'Awaiting Approval'],
              ].map(([name, status], i) => (
                <div
                  key={name}
                  className={`flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3 border border-[var(--color-line)] animate-rise-delay-${i + 1}`}
                >
                  <span className="font-medium">{name}</span>
                  <span className="text-sm text-teal-800">{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="mb-8 max-w-2xl">
          <h2 className="font-display text-3xl font-700">From call recording to signed deal</h2>
          <p className="mt-2 text-[var(--color-ink-soft)]">
            Upload a transcript, extract requirements with confidence scores, generate pricing, and track every client open.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: 'AI call analysis',
              body: 'Requirements, pain points, budget ranges, decision makers, and urgency — with confidence.',
            },
            {
              icon: FileCheck2,
              title: 'Proposal generator',
              body: 'Scope, timeline, and smart packages your team can edit before sending.',
            },
            {
              icon: Radar,
              title: 'Deal tracking',
              body: 'Know when a proposal is opened, pricing is viewed, changes are requested, or accepted.',
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-3xl border border-[var(--color-line)] bg-white/70 p-5">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-teal-800">
                <Icon size={20} />
              </div>
              <h3 className="font-display text-xl font-700">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
