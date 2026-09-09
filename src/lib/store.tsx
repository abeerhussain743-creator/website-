"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { seedData } from "./seed";
import type { AppData } from "./types";

type ForgeStore = {
  data: AppData;
  loading: boolean;
  toast: string | null;
  clearToast: () => void;
  refresh: () => Promise<void>;
  resetData: () => Promise<void>;
  convertQuotation: (quotationId: string) => Promise<void>;
  startProduction: (productionOrderId: string) => Promise<void>;
  createPurchaseFromShortage: (productionOrderId: string) => Promise<void>;
};

const ForgeContext = createContext<ForgeStore | null>(null);

async function readJson(res: Response) {
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Request failed");
  }
  return json as { data: AppData; message?: string };
}

export function ForgeProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(seedData);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const clearToast = useCallback(() => setToast(null), []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/data");
    const json = await readJson(res);
    setData(json.data);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await refresh();
      } catch {
        if (alive) setToast("Could not load live tenant data");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [refresh]);

  const applyMutation = useCallback(async (url: string) => {
    const res = await fetch(url, { method: "POST" });
    const json = await readJson(res);
    setData(json.data);
    if (json.message) setToast(json.message);
  }, []);

  const convertQuotation = useCallback(
    async (quotationId: string) => {
      await applyMutation(`/api/quotations/${quotationId}/convert`);
    },
    [applyMutation]
  );

  const startProduction = useCallback(
    async (productionOrderId: string) => {
      await applyMutation(`/api/production/${productionOrderId}/start`);
    },
    [applyMutation]
  );

  const createPurchaseFromShortage = useCallback(
    async (productionOrderId: string) => {
      await applyMutation(`/api/production/${productionOrderId}/shortage`);
    },
    [applyMutation]
  );

  const resetData = useCallback(async () => {
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    const json = await readJson(res);
    setData(json.data);
    setToast(json.message || "Data reset");
  }, []);

  const value = useMemo(
    () => ({
      data,
      loading,
      toast,
      clearToast,
      refresh,
      resetData,
      convertQuotation,
      startProduction,
      createPurchaseFromShortage,
    }),
    [
      data,
      loading,
      toast,
      clearToast,
      refresh,
      resetData,
      convertQuotation,
      startProduction,
      createPurchaseFromShortage,
    ]
  );

  return <ForgeContext.Provider value={value}>{children}</ForgeContext.Provider>;
}

export function useForge() {
  const ctx = useContext(ForgeContext);
  if (!ctx) throw new Error("useForge must be used within ForgeProvider");
  return ctx;
}
