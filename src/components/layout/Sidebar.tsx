"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appNav } from "@/lib/nav";
import { useForge } from "@/lib/store";
import { roleLabels } from "@/lib/format";
import { cn } from "@/lib/format";

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useForge();

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col bg-[linear-gradient(180deg,#0a3542_0%,#134e5e_55%,#0f3f4d_100%)] text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/" className="display text-2xl font-extrabold tracking-tight">
          Forge
        </Link>
        <p className="mt-1 text-xs text-white/60">Manufacturing OS</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {appNav.map((item) => {
          const active =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("nav-link", active && "active")}
            >
              <Icon size={17} strokeWidth={2.1} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/8 px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(245,158,11,0.25)] text-sm font-bold text-amber-100">
              {data.user.avatarInitials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{data.user.name}</p>
              <p className="truncate text-xs text-white/55">
                {roleLabels[data.user.role]} · {data.company.plan}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
