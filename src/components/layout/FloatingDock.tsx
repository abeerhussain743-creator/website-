"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Home, Layers, Sparkles, Wallet } from "lucide-react";

const DOCK = [
  { href: "#top", icon: Home, label: "Home" },
  { href: "#products", icon: Layers, label: "Products" },
  { href: "#services", icon: Sparkles, label: "Services" },
  { href: "#pricing", icon: Wallet, label: "Pricing" },
];

export function FloatingDock() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[75] hidden -translate-x-1/2 md:block">
        <div className="glass-strong pointer-events-auto flex items-center gap-1 rounded-full px-2 py-2 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          {DOCK.map((item) => (
            <a
              key={item.href}
              href={item.href}
              title={item.label}
              className="group relative flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              data-cursor="hover"
            >
              <item.icon className="h-4 w-4" />
              <span className="pointer-events-none absolute -top-8 rounded-md bg-black/80 px-2 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                {item.label}
              </span>
            </a>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showTop && (
          <motion.a
            href="#top"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="glass fixed bottom-5 left-5 z-[80] flex h-11 w-11 items-center justify-center rounded-full text-white"
            aria-label="Back to top"
            data-cursor="hover"
          >
            <ArrowUp className="h-4 w-4" />
          </motion.a>
        )}
      </AnimatePresence>
    </>
  );
}
