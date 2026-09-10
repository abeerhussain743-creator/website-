import type { AppData, ProductionOrder, Quotation } from "./types";

export type MutationResult = {
  data: AppData;
  message: string;
};

export function convertQuotation(data: AppData, quotationId: string): MutationResult {
  const q = data.quotations.find((x) => x.id === quotationId);
  if (!q) throw new Error("Quotation not found");
  if (q.status === "converted") throw new Error("Quotation already converted");

  const number = `SO-${8850 + data.salesOrders.length}`;
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
  const quotations: Quotation[] = data.quotations.map((item) =>
    item.id === quotationId ? { ...item, status: "converted" } : item
  );

  return {
    message: `Converted ${q.number} → ${number}`,
    data: {
      ...data,
      quotations,
      salesOrders: [order, ...data.salesOrders],
      alerts: [
        {
          id: `a_${Date.now()}`,
          severity: "info",
          module: "Sales",
          title: `Quotation ${q.number} converted`,
          detail: `Created sales order ${number}`,
          time: "just now",
        },
        ...data.alerts,
      ],
    },
  };
}

export function startProduction(data: AppData, productionOrderId: string): MutationResult {
  const target = data.productionOrders.find((p) => p.id === productionOrderId);
  if (!target) throw new Error("Production order not found");

  return {
    message: `Started production on ${target.number}`,
    data: {
      ...data,
      productionOrders: data.productionOrders.map((p: ProductionOrder) =>
        p.id === productionOrderId &&
        (p.status === "ready" || p.status === "materials_check")
          ? {
              ...p,
              status: "in_production",
              progress: Math.max(p.progress, 5),
              materialsReady: true,
            }
          : p
      ),
    },
  };
}

export function createPurchaseFromShortage(
  data: AppData,
  productionOrderId: string
): MutationResult {
  const po = data.productionOrders.find((p) => p.id === productionOrderId);
  if (!po) throw new Error("Production order not found");
  const bom = data.boms.find((b) => b.productId === po.productId);
  if (!bom) throw new Error("BOM not found");

  const shortageLines = bom.lines
    .map((line) => {
      const product = data.products.find((p) => p.id === line.productId);
      if (!product) return null;
      const required = line.quantity * po.quantity;
      const available = product.quantity - product.reserved;
      const shortage = Math.max(0, required - available);
      if (shortage <= 0) return null;
      return {
        productId: product.id,
        quantity: shortage,
        unitCost: Number((product.unitCost * 1.04).toFixed(4)),
        name: product.name,
        unit: product.unit,
        supplierId: product.supplierId ?? "s1",
      };
    })
    .filter(Boolean) as {
    productId: string;
    quantity: number;
    unitCost: number;
    name: string;
    unit: string;
    supplierId: string;
  }[];

  if (shortageLines.length === 0) {
    return {
      message: `No material shortage on ${po.number} — marked ready`,
      data: {
        ...data,
        productionOrders: data.productionOrders.map((p) =>
          p.id === productionOrderId
            ? { ...p, materialsReady: true, status: "ready" }
            : p
        ),
      },
    };
  }

  const number = `PO-${4415 + data.purchaseOrders.length}`;
  const primary = shortageLines[0];
  const total = shortageLines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  const summary = shortageLines
    .map((l) => `${l.quantity.toLocaleString()} ${l.unit} ${l.name}`)
    .join(", ");

  return {
    message: `Created ${number} for shortage: ${summary}`,
    data: {
      ...data,
      productionOrders: data.productionOrders.map((p) =>
        p.id === productionOrderId
          ? { ...p, status: "materials_check", materialsReady: false }
          : p
      ),
      purchaseOrders: [
        {
          id: `po_${Date.now()}`,
          number,
          supplierId: primary.supplierId,
          date: new Date().toISOString().slice(0, 10),
          expectedDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
          lines: shortageLines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitCost: l.unitCost,
          })),
          status: "request",
          total,
        },
        ...data.purchaseOrders,
      ],
      alerts: [
        {
          id: `a_${Date.now()}`,
          severity: "warning",
          module: "Purchase",
          title: `Material shortage → ${number}`,
          detail: `Auto-created purchase request for ${summary} (${po.number})`,
          time: "just now",
        },
        ...data.alerts,
      ],
    },
  };
}
