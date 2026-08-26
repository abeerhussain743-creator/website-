import { statusTone, cn } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone[status] ?? "tone-muted";
  const label = status.replaceAll("_", " ");
  return <span className={cn("badge", tone)}>{label}</span>;
}

export function PageHeaderNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex gap-3 rounded-[16px] border border-[rgba(184,146,90,0.22)] bg-[linear-gradient(135deg,rgba(212,180,131,0.12),rgba(255,255,255,0.8))] px-4 py-3.5 text-sm text-[var(--ink-soft)]">
      <span className="mt-0.5 inline-flex h-6 shrink-0 items-center rounded-full bg-[rgba(184,146,90,0.18)] px-2 text-[10px] font-bold uppercase tracking-wide text-[#7a5a2e]">
        Tip
      </span>
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="muted py-8 text-center text-sm">{children}</p>;
}

export function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn" | "bad" | "ok";
}) {
  const accent =
    tone === "warn"
      ? "from-[rgba(183,121,31,0.14)] to-white"
      : tone === "bad"
        ? "from-[rgba(192,57,43,0.12)] to-white"
        : tone === "ok"
          ? "from-[rgba(31,122,92,0.12)] to-white"
          : "from-[rgba(42,82,80,0.1)] to-white";

  const bar =
    tone === "warn"
      ? "bg-[var(--warn)]"
      : tone === "bad"
        ? "bg-[var(--bad)]"
        : tone === "ok"
          ? "bg-[var(--ok)]"
          : "bg-[var(--champagne)]";

  return (
    <div className={cn("panel-flat relative overflow-hidden bg-gradient-to-br p-5", accent)}>
      <span className={cn("absolute inset-y-3 left-0 w-1 rounded-full", bar)} />
      <p className="pl-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-soft)]">
        {label}
      </p>
      <p className="metric-value mt-2.5 pl-2">{value}</p>
      {hint ? <p className="muted mt-1.5 pl-2 text-xs">{hint}</p> : null}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel p-5 sm:p-6", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="display text-[1.15rem] font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
