"use client";

import { ForgeProvider, useForge } from "@/lib/store";
import { Sidebar } from "@/components/layout/Sidebar";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";
import { navForRole } from "@/lib/permissions";

function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data } = useForge();
  const groups = navForRole(data.user.role);

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between border-b border-white/10 bg-[var(--steel-deep)] px-4 py-3.5 text-white">
        <Link href="/" className="display text-xl font-extrabold">
          Forge
        </Link>
        <button
          type="button"
          className="rounded-xl p-2 hover:bg-white/10"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open ? (
        <div className="max-h-[70vh] overflow-y-auto border-b border-white/10 bg-[var(--steel)] px-3 py-3">
          {groups.map((group) => (
            <div key={group.label} className="mb-2">
              <p className="nav-group-label">{group.label}</p>
              <nav className="grid gap-0.5">
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
          ))}
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
      <div className="pointer-events-auto rounded-2xl border border-[rgba(212,180,131,0.35)] bg-[var(--steel-deep)] px-4 py-3.5 text-sm text-white shadow-[var(--shadow-lg)]">
        {toast}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ForgeProvider>
      <AppShellInner>{children}</AppShellInner>
    </ForgeProvider>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { loading } = useForge();

  return (
    <>
      <div className="flex min-h-screen">
        <div className="sticky top-0 hidden h-screen lg:block">
          <Sidebar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileNav />
          <main className="blueprint-grid flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6">
            <div className="app-frame mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
              {loading ? (
                <div className="py-16 text-center">
                  <p className="display text-2xl font-semibold">Loading plant data…</p>
                  <p className="muted mt-2 text-sm">Syncing Apex Metalworks tenant from the API</p>
                </div>
              ) : (
                children
              )}
            </div>
          </main>
        </div>
      </div>
      <ToastHost />
    </>
  );
}
