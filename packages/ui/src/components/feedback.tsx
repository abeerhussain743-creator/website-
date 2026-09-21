import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[12px] bg-[var(--muted)]",
        className,
      )}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[16px] border border-dashed border-[var(--border)] bg-[var(--card)] p-8">
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="max-w-md text-sm text-[var(--muted-foreground)]">{description}</p>
      {action}
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="font-display mt-2 text-3xl font-semibold tabular-nums text-[var(--gold-dark)] dark:text-[var(--gold)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}
