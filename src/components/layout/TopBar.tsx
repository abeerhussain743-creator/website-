"use client";

import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { useForge } from "@/lib/store";

export function TopBar({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { data } = useForge();
  const critical = data.alerts.filter((a) => a.severity !== "info").length;

  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
          {data.company.name}
        </p>
        <h1 className="section-title mt-1">{title}</h1>
        {subtitle ? <p className="muted mt-1 max-w-2xl text-sm">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-3 py-2 text-sm text-[var(--ink-soft)] md:flex">
          <Search size={15} />
          <span>Search orders, SKUs, machines…</span>
        </div>
        <Link href="/app" className="btn btn-ghost relative px-3 py-2">
          <Bell size={16} />
          {critical > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--signal)] px-1 text-[10px] font-bold text-white">
              {critical}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
