import { statusTone, cn } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone[status] ?? "tone-muted";
  const label = status.replaceAll("_", " ");
  return <span className={cn("badge", tone)}>{label}</span>;
}

export function PageHeaderNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 rounded-[14px] border border-dashed border-[rgba(19,78,94,0.25)] bg-[rgba(19,78,94,0.05)] px-4 py-3 text-sm text-[var(--ink-soft)]">
      {children}
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
      ? "border-l-[var(--warn)]"
      : tone === "bad"
        ? "border-l-[var(--bad)]"
        : tone === "ok"
          ? "border-l-[var(--ok)]"
          : "border-l-[var(--steel)]";

  return (
    <div className={cn("panel-flat border-l-4 p-4", accent)}>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-soft)]">
        {label}
      </p>
      <p className="metric-value mt-2">{value}</p>
      {hint ? <p className="muted mt-1 text-xs">{hint}</p> : null}
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
    <section className={cn("panel p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="display text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
