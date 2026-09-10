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
import type { AppData, DecisionSettings } from "./types";

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
  completeProduction: (productionOrderId: string) => Promise<void>;
  receivePurchase: (purchaseOrderId: string) => Promise<void>;
  invoiceSalesOrder: (salesOrderId: string) => Promise<void>;
  dispatchSalesOrder: (salesOrderId: string) => Promise<void>;
  runRules: () => Promise<void>;
  analyze: () => Promise<void>;
  ask: (question: string) => Promise<void>;
  approveDecision: (decisionId: string) => Promise<void>;
  rejectDecision: (decisionId: string) => Promise<void>;
  executeDecision: (decisionId: string) => Promise<void>;
  overrideDecision: (decisionId: string) => Promise<void>;
  autoExecute: () => Promise<void>;
  updateSettings: (settings: Partial<DecisionSettings>) => Promise<void>;
};

const ForgeContext = createContext<ForgeStore | null>(null);

async function readJson(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
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

  const post = useCallback(async (url: string, body?: object) => {
    const res = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await readJson(res);
    setData(json.data);
    if (json.message) setToast(json.message);
  }, []);

  const value = useMemo<ForgeStore>(
    () => ({
      data,
      loading,
      toast,
      clearToast,
      refresh,
      resetData: async () =>
        post("/api/data", { action: "reset" }),
      convertQuotation: async (quotationId) =>
        post(`/api/quotations/${quotationId}/convert`),
      startProduction: async (productionOrderId) =>
        post(`/api/production/${productionOrderId}/start`),
      createPurchaseFromShortage: async (productionOrderId) =>
        post(`/api/production/${productionOrderId}/shortage`),
      completeProduction: async (productionOrderId) =>
        post(`/api/production/${productionOrderId}/complete`, { action: "complete" }),
      receivePurchase: async (purchaseOrderId) =>
        post(`/api/purchase/${purchaseOrderId}/receive`),
      invoiceSalesOrder: async (salesOrderId) =>
        post(`/api/sales/${salesOrderId}`, { action: "invoice" }),
      dispatchSalesOrder: async (salesOrderId) =>
        post(`/api/sales/${salesOrderId}`, { action: "dispatch" }),
      runRules: async () => post("/api/decisions", { action: "run_rules" }),
      analyze: async () => post("/api/decisions", { action: "analyze" }),
      ask: async (question) => post("/api/decisions", { action: "ask", question }),
      approveDecision: async (decisionId) =>
        post("/api/decisions", { action: "approve", decisionId }),
      rejectDecision: async (decisionId) =>
        post("/api/decisions", { action: "reject", decisionId }),
      executeDecision: async (decisionId) =>
        post("/api/decisions", { action: "execute", decisionId }),
      overrideDecision: async (decisionId) =>
        post("/api/decisions", { action: "override", decisionId }),
      autoExecute: async () => post("/api/decisions", { action: "auto_execute" }),
      updateSettings: async (settings) =>
        post("/api/decisions", { action: "update_settings", settings }),
    }),
    [data, loading, toast, clearToast, refresh, post]
  );

  return <ForgeContext.Provider value={value}>{children}</ForgeContext.Provider>;
}

export function useForge() {
  const ctx = useContext(ForgeContext);
  if (!ctx) throw new Error("useForge must be used within ForgeProvider");
  return ctx;
}
