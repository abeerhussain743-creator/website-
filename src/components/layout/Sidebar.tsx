"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useForge } from "@/lib/store";
import { roleLabels, cn } from "@/lib/format";
import { navForRole } from "@/lib/permissions";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useForge();
  const groups = navForRole(data.user.role);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-[268px] shrink-0 flex-col bg-[linear-gradient(175deg,#102828_0%,#1b3a3a_48%,#243f3d_100%)] text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/" className="display text-2xl font-extrabold tracking-tight">
          Forge
        </Link>
        <p className="mt-1 text-xs text-white/55">Manufacturing OS</p>
        <div className="easy-chip mt-3 bg-[rgba(212,180,131,0.18)] text-[rgba(244,230,200,0.95)]">
          {data.user.department} desk
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {groups.map((group) => (
          <div key={group.label} className="mb-1">
            <p className="nav-group-label">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
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
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-2xl bg-white/8 px-3 py-3 ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d4b483,#b8925a)] text-sm font-bold text-[#1a140c]">
              {data.user.avatarInitials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{data.user.name}</p>
              <p className="truncate text-xs text-white/55">
                {roleLabels[data.user.role]} · {data.company.plan}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/15"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
