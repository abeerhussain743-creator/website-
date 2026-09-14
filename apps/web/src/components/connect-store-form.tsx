"use client";

import { useState } from "react";

export function ConnectStoreForm() {
  const [shop, setShop] = useState("");

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white/80 p-5 shadow-soft sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const value = shop.trim();
        if (!value) return;
        window.location.href = `/api/auth/shopify/install?shop=${encodeURIComponent(value)}`;
      }}
    >
      <input
        value={shop}
        onChange={(e) => setShop(e.target.value)}
        placeholder="your-store.myshopify.com"
        className="w-full flex-1 rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
      />
      <button
        type="submit"
        className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white"
      >
        Connect with Shopify
      </button>
    </form>
  );
}
