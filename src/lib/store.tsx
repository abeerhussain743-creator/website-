"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { seedData } from "./seed";
import type { AppData, ProductionOrder, Quotation } from "./types";

type ForgeStore = {
  data: AppData;
  convertQuotation: (quotationId: string) => void;
  startProduction: (productionOrderId: string) => void;
  createPurchaseFromShortage: (productionOrderId: string) => void;
};

const ForgeContext = createContext<ForgeStore | null>(null);

export function ForgeProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(seedData);

  const convertQuotation = useCallback((quotationId: string) => {
    setData((prev) => {
      const q = prev.quotations.find((x) => x.id === quotationId);
      if (!q || q.status === "converted") return prev;
      const number = `SO-${8850 + prev.salesOrders.length}`;
      const order = {
        id: `so_${Date.now()}`,
        number,
        customerId: q.customerId,
        quotationId: q.id,
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
        lines: q.lines,
        status: "confirmed" as const,
      };
      const quotations: Quotation[] = prev.quotations.map((item) =>
        item.id === quotationId ? { ...item, status: "converted" } : item
      );
      return {
        ...prev,
        quotations,
        salesOrders: [order, ...prev.salesOrders],
        alerts: [
          {
            id: `a_${Date.now()}`,
            severity: "info",
            module: "Sales",
            title: `Quotation ${q.number} converted`,
            detail: `Created sales order ${number}`,
            time: "just now",
          },
          ...prev.alerts,
        ],
      };
    });
  }, []);

  const startProduction = useCallback((productionOrderId: string) => {
    setData((prev) => ({
      ...prev,
      productionOrders: prev.productionOrders.map((p: ProductionOrder) =>
        p.id === productionOrderId && (p.status === "ready" || p.status === "materials_check")
          ? { ...p, status: "in_production", progress: Math.max(p.progress, 5), materialsReady: true }
          : p
      ),
    }));
  }, []);

  const createPurchaseFromShortage = useCallback((productionOrderId: string) => {
    setData((prev) => {
      const po = prev.productionOrders.find((p) => p.id === productionOrderId);
      if (!po) return prev;
      const bom = prev.boms.find((b) => b.productId === po.productId);
      if (!bom) return prev;
      const steel = prev.products.find((p) => p.id === "p_steel");
      if (!steel) return prev;
      const required = (bom.lines.find((l) => l.productId === "p_steel")?.quantity ?? 0) * po.quantity;
      const available = steel.quantity - steel.reserved;
      const shortage = Math.max(0, required - available);
      if (shortage <= 0) {
        return {
          ...prev,
          productionOrders: prev.productionOrders.map((p) =>
            p.id === productionOrderId
              ? { ...p, materialsReady: true, status: "ready" }
              : p
          ),
        };
      }
      const number = `PO-${4415 + prev.purchaseOrders.length}`;
      return {
        ...prev,
        productionOrders: prev.productionOrders.map((p) =>
          p.id === productionOrderId
            ? { ...p, status: "materials_check", materialsReady: false }
            : p
        ),
        purchaseOrders: [
          {
            id: `po_${Date.now()}`,
            number,
            supplierId: "s1",
            date: new Date().toISOString().slice(0, 10),
            expectedDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
            lines: [{ productId: "p_steel", quantity: shortage, unitCost: 1.92 }],
            status: "request",
            total: shortage * 1.92,
          },
          ...prev.purchaseOrders,
        ],
        alerts: [
          {
            id: `a_${Date.now()}`,
            severity: "warning",
            module: "Purchase",
            title: `Material shortage → ${number}`,
            detail: `Auto-created purchase request for ${shortage.toLocaleString()} KG steel for ${po.number}`,
            time: "just now",
          },
          ...prev.alerts,
        ],
      };
    });
  }, []);

  const value = useMemo(
    () => ({ data, convertQuotation, startProduction, createPurchaseFromShortage }),
    [data, convertQuotation, startProduction, createPurchaseFromShortage]
  );

  return <ForgeContext.Provider value={value}>{children}</ForgeContext.Provider>;
}

export function useForge() {
  const ctx = useContext(ForgeContext);
  if (!ctx) throw new Error("useForge must be used within ForgeProvider");
  return ctx;
}
