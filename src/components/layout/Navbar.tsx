"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { NAV_LINKS, SITE } from "@/lib/constants";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 right-0 left-0 z-[70] px-4 pt-4 md:px-6"
      >
        <nav
          className={cn(
            "mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5 transition-all duration-500 md:px-5",
            scrolled
              ? "glass-strong shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
              : "border border-transparent bg-transparent"
          )}
        >
          <a href="#top" className="group flex items-center gap-2.5" data-cursor="hover">
            <span className="relative flex h-8 w-8 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-[#4F8CFF] to-[#2DD4FF] opacity-80 blur-[6px] transition group-hover:opacity-100" />
              <span className="relative h-7 w-7 rounded-full bg-[#06070A] ring-1 ring-white/20">
                <span className="absolute inset-[5px] rounded-full bg-gradient-to-br from-[#4F8CFF] via-[#2DD4FF] to-[#6E5BFF]" />
              </span>
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-white">
              {SITE.name}
            </span>
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-full px-3.5 py-2 text-sm text-white/65 transition hover:bg-white/5 hover:text-white"
                  data-cursor="hover"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-2 md:flex">
            <MagneticButton href="#final-cta" variant="primary" className="!px-5 !py-2.5 text-xs">
              Book Strategy Call
            </MagneticButton>
          </div>

          <button
            type="button"
            className="glass rounded-full p-2.5 text-white lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[85] bg-[#06070A]/95 backdrop-blur-xl lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between px-5 pt-6">
              <span className="font-display text-lg font-semibold">{SITE.name}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="glass rounded-full p-2.5"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="mt-10 flex flex-col gap-2 px-6">
              {NAV_LINKS.map((link, i) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="font-display block py-3 text-3xl font-medium text-white"
                  >
                    {link.label}
                  </a>
                </motion.li>
              ))}
            </ul>
            <div className="absolute right-6 bottom-10 left-6">
              <MagneticButton
                href="#final-cta"
                variant="primary"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                Book Strategy Call
              </MagneticButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
