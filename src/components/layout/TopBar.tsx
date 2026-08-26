"use client";

import Link from "next/link";
import { Bell, Search, Sparkles } from "lucide-react";
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
    <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            {data.company.name}
          </p>
          <span className="easy-chip">Easy mode · clear actions</span>
        </div>
        <h1 className="section-title mt-2">{title}</h1>
        {subtitle ? <p className="muted mt-1.5 max-w-2xl text-[0.95rem]">{subtitle}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="hidden min-w-[240px] items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3.5 py-2.5 text-sm text-[var(--ink-soft)] shadow-[var(--shadow)] md:flex">
          <Search size={15} className="shrink-0 text-[var(--champagne)]" />
          <input
            className="w-full border-0 bg-transparent outline-none placeholder:text-[var(--ink-soft)]"
            placeholder="Search orders, SKUs, machines…"
            aria-label="Search"
          />
        </label>
        <Link href="/app/ai" className="btn btn-signal py-2.5 text-sm">
          <Sparkles size={15} />
          Ask AI
        </Link>
        <Link href="/app" className="btn btn-ghost relative px-3.5 py-2.5">
          <Bell size={16} />
          {critical > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--bad)] px-1 text-[10px] font-bold text-white">
              {critical}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
