"use client";

import { ForgeProvider, useForge } from "@/lib/store";
import { Sidebar } from "@/components/layout/Sidebar";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { appNav } from "@/lib/nav";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--steel-deep)] px-4 py-3 text-white">
        <Link href="/" className="display text-xl font-extrabold">
          Forge
        </Link>
        <button
          type="button"
          className="rounded-lg p-2 hover:bg-white/10"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open ? (
        <div className="border-b border-[var(--line)] bg-[var(--steel)] px-3 py-3">
          <nav className="grid gap-1">
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
                  onClick={() => setOpen(false)}
                  className={cn("nav-link", active && "active")}
                >
                  <Icon size={16} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </div>
  );
}

function ToastHost() {
  const { toast, clearToast } = useForge();

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(clearToast, 4200);
    return () => window.clearTimeout(id);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 max-w-sm fade-up">
      <div className="pointer-events-auto rounded-xl border border-[rgba(19,78,94,0.25)] bg-[var(--steel-deep)] px-4 py-3 text-sm text-white shadow-[var(--shadow)]">
        {toast}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ForgeProvider>
      <div className="flex min-h-screen">
        <div className="sticky top-0 hidden h-screen lg:block">
          <Sidebar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileNav />
          <main className="blueprint-grid flex-1 px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
      <ToastHost />
    </ForgeProvider>
  );
}
