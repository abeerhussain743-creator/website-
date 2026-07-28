"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Command, Search, X } from "lucide-react";
import { NAV_LINKS, PRODUCTS, SITE } from "@/lib/constants";

const RESULTS = [
  ...NAV_LINKS.map((l) => ({ label: l.label, href: l.href, group: "Navigate" })),
  ...PRODUCTS.slice(0, 5).map((p) => ({
    label: p.name,
    href: "#products",
    group: "Products",
  })),
  { label: "Book Strategy Call", href: "#final-cta", group: "Actions" },
  { label: "Pricing", href: "#pricing", group: "Navigate" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = RESULTS.filter((r) =>
    r.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass fixed right-5 bottom-24 z-[80] hidden items-center gap-2 rounded-full px-3 py-2 text-xs text-muted md:flex"
        aria-label="Open command palette"
        data-cursor="hover"
      >
        <Search className="h-3.5 w-3.5" />
        Search
        <span className="ml-1 flex items-center gap-0.5 rounded border border-white/10 px-1.5 py-0.5 text-[10px]">
          <Command className="h-2.5 w-2.5" />K
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[95] flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="glass-strong w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label={`${SITE.name} command palette`}
            >
              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                <Search className="h-4 w-4 text-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products, pages, actions…"
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted-dim"
                />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-muted hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="max-h-72 overflow-y-auto p-2">
                {filtered.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-muted">
                    No results
                  </li>
                )}
                {filtered.map((item) => (
                  <li key={`${item.group}-${item.label}`}>
                    <a
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-white/90 transition hover:bg-white/8"
                    >
                      <span>{item.label}</span>
                      <span className="text-[10px] tracking-wider text-muted uppercase">
                        {item.group}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
