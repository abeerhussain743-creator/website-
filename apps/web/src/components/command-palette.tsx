"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Users,
  Wallet,
  MessageSquare,
  Settings,
  ClipboardCheck,
  Inbox,
  Building2,
  Plus,
} from "lucide-react";

const pages = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/admissions", label: "Admissions", icon: Building2 },
  { href: "/admissions/new", label: "New lead", icon: Plus },
  { href: "/fees", label: "Fees", icon: Wallet },
  { href: "/fees/record", label: "Record payment", icon: Wallet },
  { href: "/attendance", label: "Mark attendance", icon: ClipboardCheck },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/broadcasts", label: "Broadcasts", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--ink)]/40 p-4 pt-[15vh]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close command palette"
        onClick={() => onOpenChange(false)}
      />
      <Command
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card)] shadow-soft"
        label="Command palette"
      >
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search pages and actions…"
          className="h-12 w-full border-b border-[var(--border)] bg-transparent px-4 text-sm outline-none"
        />
        <Command.List className="max-h-80 overflow-auto p-2">
          <Command.Empty className="px-3 py-6 text-sm text-[var(--muted-foreground)]">
            No results.
          </Command.Empty>
          <Command.Group heading="Navigate" className="text-xs text-[var(--muted-foreground)]">
            {pages.map((page) => {
              const Icon = page.icon;
              return (
                <Command.Item
                  key={page.href}
                  value={page.label}
                  onSelect={() => {
                    onOpenChange(false);
                    router.push(page.href);
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-sm text-[var(--foreground)] aria-selected:bg-[var(--muted)]"
                >
                  <Icon className="h-4 w-4" />
                  {page.label}
                </Command.Item>
              );
            })}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
