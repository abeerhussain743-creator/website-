"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, X } from "lucide-react";
import { SITE } from "@/lib/constants";

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "assistant" | "user"; text: string }[]
  >([
    {
      role: "assistant",
      text: `Welcome to ${SITE.name}. Ask about products, enterprise AI, or book a strategy session.`,
    },
  ]);

  useEffect(() => {
    const t = setTimeout(() => {
      // subtle presence pulse handled via CSS
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  const send = () => {
    if (!input.trim()) return;
    const q = input.trim();
    setInput("");
    setMessages((m) => [
      ...m,
      { role: "user", text: q },
      {
        role: "assistant",
        text: "Our team designs AI operating systems around your workflows. Scroll to Pricing or book a strategy call—we'll map the right path.",
      },
    ]);
  };

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-strong fixed right-5 bottom-5 z-[80] flex h-14 w-14 items-center justify-center rounded-full shadow-[0_0_40px_rgba(79,140,255,0.35)]"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        aria-label="Open AI assistant"
        data-cursor="hover"
      >
        <span className="animate-pulse-glow absolute inset-0 rounded-full bg-[#4F8CFF]/30 blur-md" />
        <MessageCircle className="relative h-5 w-5 text-white" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="glass-strong fixed right-5 bottom-24 z-[85] flex h-[420px] w-[min(100vw-2rem,360px)] flex-col overflow-hidden rounded-3xl shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">{SITE.name} Assistant</p>
                <p className="text-[11px] text-[#2DD4FF]">Online · Enterprise ready</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-muted hover:bg-white/5 hover:text-white"
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "assistant"
                      ? "max-w-[90%] rounded-2xl rounded-tl-sm bg-white/5 px-3 py-2 text-sm text-white/85"
                      : "ml-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-[#4F8CFF]/25 px-3 py-2 text-sm text-white"
                  }
                >
                  {m.text}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-white/10 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask anything…"
                className="flex-1 rounded-full bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-muted-dim"
              />
              <button
                type="button"
                onClick={send}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4F8CFF] text-white"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
