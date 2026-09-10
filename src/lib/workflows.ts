import type { AppData, Invoice } from "./types";
import type { MutationResult } from "./mutations";

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function refreshMetrics(data: AppData): AppData {
  const lowStockItems = data.products.filter(
    (p) => p.reorderPoint > 0 && p.quantity - p.reserved <= p.reorderPoint
  ).length;
  const receivables = data.invoices
    .filter((i) => i.type === "receivable" && i.status !== "paid")
    .reduce((s, i) => s + (i.amount - i.paid), 0);
  const payables = data.invoices
    .filter((i) => i.type === "payable" && i.status !== "paid")
    .reduce((s, i) => s + (i.amount - i.paid), 0);
  const cashBalance = data.bankAccounts.reduce((s, b) => s + b.balance, 0);

  return {
    ...data,
    metrics: {
      ...data.metrics,
      salesOrders: data.salesOrders.length,
      productionOrders: data.productionOrders.length,
      pendingOrders: data.salesOrders.filter((s) =>
        ["confirmed", "in_production", "ready"].includes(s.status)
      ).length,
      lowStockItems,
      purchaseOrders: data.purchaseOrders.length,
      receivables,
      payables,
      cashBalance,
    },
  };
}

export function invoiceFromSalesOrder(data: AppData, salesOrderId: string): MutationResult {
  const so = data.salesOrders.find((s) => s.id === salesOrderId);
  if (!so) throw new Error("Sales order not found");
  if (so.status === "paid") throw new Error("Sales order already paid");
  if (so.status === "invoiced") throw new Error("Sales order already invoiced");

  const customer = data.customers.find((c) => c.id === so.customerId);
  const amount = so.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const invoice: Invoice = {
    id: id("inv"),
    number: `INV-${5500 + data.invoices.length}`,
    type: "receivable",
    partyName: customer?.company ?? "Customer",
    date: nowIso().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    amount,
    paid: 0,
    status: "open",
  };

  return {
    message: `Created ${invoice.number} for ${so.number} · $${amount.toLocaleString()}`,
    data: refreshMetrics({
      ...data,
      invoices: [invoice, ...data.invoices],
      salesOrders: data.salesOrders.map((s) =>
        s.id === salesOrderId ? { ...s, status: "invoiced" } : s
      ),
      customers: data.customers.map((c) =>
        c.id === so.customerId ? { ...c, outstanding: c.outstanding + amount } : c
      ),
      alerts: [
        {
          id: id("a"),
          severity: "info",
          module: "Accounts",
          title: `Invoice ${invoice.number} created`,
          detail: `${invoice.partyName} · $${amount.toLocaleString()} due ${invoice.dueDate}`,
          time: "just now",
        },
        ...data.alerts,
      ],
    }),
  };
}

export function completeProduction(data: AppData, productionOrderId: string): MutationResult {
  const po = data.productionOrders.find((p) => p.id === productionOrderId);
  if (!po) throw new Error("Production order not found");
  if (data.qcBlocks.includes(po.number) || data.qcBlocks.includes(po.id)) {
    throw new Error(`QC block active on ${po.number}. Clear QC decision first.`);
  }

  const bom = data.boms.find((b) => b.productId === po.productId);
  const products = data.products.map((p) => ({ ...p }));

  if (bom) {
    for (const line of bom.lines) {
      const idx = products.findIndex((p) => p.id === line.productId);
      if (idx >= 0) {
        const consume = line.quantity * po.quantity;
        products[idx] = {
          ...products[idx],
          quantity: Math.max(0, products[idx].quantity - consume),
          reserved: Math.max(
            0,
            products[idx].reserved - Math.min(products[idx].reserved, consume)
          ),
        };
      }
    }
  }

  const fgIdx = products.findIndex((p) => p.id === po.productId);
  if (fgIdx >= 0) {
    products[fgIdx] = {
      ...products[fgIdx],
      quantity: products[fgIdx].quantity + po.quantity,
    };
  }

  return {
    message: `Completed ${po.number} · ${po.quantity} units to finished goods`,
    data: refreshMetrics({
      ...data,
      products,
      productionOrders: data.productionOrders.map((p) =>
        p.id === productionOrderId
          ? { ...p, status: "completed", progress: 100, materialsReady: true }
          : p
      ),
      salesOrders: data.salesOrders.map((s) =>
        s.id === po.salesOrderId ? { ...s, status: "ready" } : s
      ),
      alerts: [
        {
          id: id("a"),
          severity: "info",
          module: "Production",
          title: `${po.number} completed`,
          detail: "Finished goods inventory updated from BOM consumption",
          time: "just now",
        },
        ...data.alerts,
      ],
    }),
  };
}

export function receivePurchaseOrder(data: AppData, purchaseOrderId: string): MutationResult {
  const po = data.purchaseOrders.find((p) => p.id === purchaseOrderId);
  if (!po) throw new Error("Purchase order not found");
  if (["received", "inspected", "invoiced", "paid"].includes(po.status)) {
    throw new Error("Purchase order already received");
  }

  const products = data.products.map((p) => {
    const line = po.lines.find((l) => l.productId === p.id);
    if (!line) return p;
    return { ...p, quantity: p.quantity + line.quantity };
  });

  return {
    message: `Received ${po.number} into inventory`,
    data: refreshMetrics({
      ...data,
      products,
      purchaseOrders: data.purchaseOrders.map((p) =>
        p.id === purchaseOrderId ? { ...p, status: "received" } : p
      ),
      productionOrders: data.productionOrders.map((p) =>
        p.status === "materials_check"
          ? { ...p, materialsReady: true, status: "ready" as const }
          : p
      ),
      alerts: [
        {
          id: id("a"),
          severity: "info",
          module: "Purchase",
          title: `${po.number} received`,
          detail: "Stock increased; material-check orders marked ready when covered",
          time: "just now",
        },
        ...data.alerts,
      ],
    }),
  };
}

export function dispatchSalesOrder(data: AppData, salesOrderId: string): MutationResult {
  const so = data.salesOrders.find((s) => s.id === salesOrderId);
  if (!so) throw new Error("Sales order not found");
  if (data.dispatchHolds.includes(so.id) || data.dispatchHolds.includes(so.number)) {
    throw new Error(`Dispatch hold on ${so.number}. Clear decision hold first.`);
  }
  if (!["ready", "confirmed", "in_production", "invoiced"].includes(so.status)) {
    throw new Error(`Cannot dispatch sales order in status ${so.status}`);
  }

  const products = data.products.map((p) => {
    const line = so.lines.find((l) => l.productId === p.id);
    if (!line) return p;
    return {
      ...p,
      quantity: Math.max(0, p.quantity - line.quantity),
      reserved: Math.max(0, p.reserved - Math.min(p.reserved, line.quantity)),
    };
  });

  return {
    message: `Dispatched ${so.number}`,
    data: refreshMetrics({
      ...data,
      products,
      salesOrders: data.salesOrders.map((s) =>
        s.id === salesOrderId ? { ...s, status: "dispatched" } : s
      ),
      alerts: [
        {
          id: id("a"),
          severity: "info",
          module: "Warehouse",
          title: `${so.number} dispatched`,
          detail: "Finished goods issued from warehouse",
          time: "just now",
        },
        ...data.alerts,
      ],
    }),
  };
}

export function upsertDecision(
  data: AppData,
  draft: {
    type: import("./types").DecisionActionType;
    title: string;
    reason: string;
    source: "rule" | "ai";
    severity: "critical" | "warning" | "info";
    autoExecutable: boolean;
    payload: Record<string, string | number | boolean | null>;
    status?: import("./types").DecisionStatus;
    dedupeKey?: string;
  }
): AppData {
  const dedupeKey = draft.dedupeKey;
  if (dedupeKey) {
    const exists = data.decisions.find(
      (d) =>
        d.type === draft.type &&
        String(d.payload.dedupeKey ?? "") === dedupeKey &&
        ["proposed", "approved"].includes(d.status)
    );
    if (exists) return data;
  }

  const action: import("./types").DecisionAction = {
    id: id("dec"),
    type: draft.type,
    title: draft.title,
    reason: draft.reason,
    source: draft.source,
    severity: draft.severity,
    status: draft.status ?? "proposed",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    autoExecutable: draft.autoExecutable,
    payload: {
      ...draft.payload,
      ...(dedupeKey ? { dedupeKey } : {}),
    },
  };

  return {
    ...data,
    decisions: [action, ...data.decisions],
  };
}
