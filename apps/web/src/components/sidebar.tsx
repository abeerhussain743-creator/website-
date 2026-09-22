"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  MessageSquare,
  Settings,
  ClipboardCheck,
  Inbox,
  Building2,
  Upload,
} from "lucide-react";
import { cn } from "@maxtrone/ui";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/imports", label: "Import", icon: Upload },
  { href: "/admissions", label: "Admissions", icon: Building2 },
  { href: "/fees", label: "Fees", icon: Wallet },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/broadcasts", label: "Broadcasts", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  institutionName,
  terminology,
}: {
  institutionName: string;
  terminology: { learner: string };
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--card)] md:flex md:flex-col">
      <div className="border-b border-[var(--border)] px-5 py-5">
        <p className="font-display text-xl font-semibold tracking-tight text-[var(--ink)] dark:text-[var(--ivory)]">
          Maxtrone
        </p>
        <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
          {institutionName}
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {links.map((link) => {
          const Icon = link.icon;
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          const label =
            link.href === "/students" ? terminology.learner + "s" : link.label;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm transition-colors duration-200",
                active
                  ? "bg-[var(--ink)] text-[var(--ivory)] dark:bg-[var(--ivory)] dark:text-[var(--ink)]"
                  : "text-[var(--body)] hover:bg-[var(--muted)]",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
