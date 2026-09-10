import type { AppData, DecisionAction } from "./types";
import type { MutationResult } from "./mutations";
import { createPurchaseFromShortage } from "./mutations";
import {
  completeProduction,
  invoiceFromSalesOrder,
  receivePurchaseOrder,
  upsertDecision,
} from "./workflows";

function openDuplicate(
  data: AppData,
  type: DecisionAction["type"],
  dedupeKey: string
) {
  return data.decisions.some(
    (d) =>
      d.type === type &&
      String(d.payload.dedupeKey ?? "") === dedupeKey &&
      ["proposed", "approved"].includes(d.status)
  );
}

/** Phase 2 — rule engine: scan tenant data and propose decisions. */
export function runDecisionRules(data: AppData): { data: AppData; created: number } {
  let next = data;
  let created = 0;
  const settings = data.decisionSettings;

  if (settings.enableShortageRule) {
    for (const po of data.productionOrders) {
      if (!["materials_check", "draft", "ready"].includes(po.status)) continue;
      if (po.materialsReady && po.status !== "materials_check") continue;
      const bom = data.boms.find((b) => b.productId === po.productId);
      if (!bom) continue;
      const hasShortage = bom.lines.some((line) => {
        const product = data.products.find((p) => p.id === line.productId);
        if (!product) return false;
        const required = line.quantity * po.quantity;
        return required > product.quantity - product.reserved;
      });
      if (!hasShortage) continue;
      const key = `shortage:${po.id}`;
      if (openDuplicate(next, "create_purchase_request", key)) continue;
      const before = next.decisions.length;
      next = upsertDecision(next, {
        type: "create_purchase_request",
        title: `Auto-buy materials for ${po.number}`,
        reason: "BOM explosion shows material shortage before production start.",
        source: "rule",
        severity: "critical",
        autoExecutable: true,
        dedupeKey: key,
        payload: { productionOrderId: po.id, productionOrderNumber: po.number },
      });
      if (next.decisions.length > before) created += 1;
    }
  }

  if (settings.enableOverdueHoldRule) {
    for (const inv of data.invoices) {
      if (inv.type !== "receivable" || inv.status !== "overdue") continue;
      const customer = data.customers.find((c) => c.company === inv.partyName);
      const relatedSo = data.salesOrders.find(
        (s) =>
          s.customerId === customer?.id &&
          ["confirmed", "ready", "in_production"].includes(s.status)
      );
      if (!relatedSo) continue;
      const key = `hold:${relatedSo.id}`;
      if (openDuplicate(next, "hold_dispatch", key)) continue;
      const before = next.decisions.length;
      next = upsertDecision(next, {
        type: "hold_dispatch",
        title: `Hold dispatch for ${relatedSo.number}`,
        reason: `${inv.number} is overdue ($${inv.amount.toLocaleString()}). Credit risk rule blocks outbound.`,
        source: "rule",
        severity: "critical",
        autoExecutable: true,
        dedupeKey: key,
        payload: {
          salesOrderId: relatedSo.id,
          salesOrderNumber: relatedSo.number,
          invoiceId: inv.id,
          invoiceNumber: inv.number,
        },
      });
      if (next.decisions.length > before) created += 1;
    }

    for (const customer of data.customers) {
      if (customer.outstanding <= customer.creditLimit) continue;
      const openSo = data.salesOrders.find(
        (s) => s.customerId === customer.id && ["confirmed", "ready"].includes(s.status)
      );
      if (!openSo) continue;
      const key = `credit:${openSo.id}`;
      if (openDuplicate(next, "credit_hold", key)) continue;
      const before = next.decisions.length;
      next = upsertDecision(next, {
        type: "credit_hold",
        title: `Credit hold · ${customer.company}`,
        reason: `Outstanding $${customer.outstanding.toLocaleString()} exceeds credit limit $${customer.creditLimit.toLocaleString()}.`,
        source: "rule",
        severity: "warning",
        autoExecutable: false,
        dedupeKey: key,
        payload: {
          customerId: customer.id,
          salesOrderId: openSo.id,
          salesOrderNumber: openSo.number,
        },
      });
      if (next.decisions.length > before) created += 1;
    }
  }

  if (settings.enableQcBlockRule) {
    for (const qc of data.qualityChecks) {
      if (qc.status !== "fail") continue;
      const key = `qc:${qc.reference}`;
      if (openDuplicate(next, "block_qc_release", key)) continue;
      const before = next.decisions.length;
      next = upsertDecision(next, {
        type: "block_qc_release",
        title: `QC block · ${qc.reference}`,
        reason: `Inspection failed (${qc.rejected} rejected). ${qc.defect ?? "Defect logged"}.`,
        source: "rule",
        severity: "critical",
        autoExecutable: true,
        dedupeKey: key,
        payload: {
          reference: qc.reference,
          qualityCheckId: qc.id,
          batch: qc.batch,
        },
      });
      if (next.decisions.length > before) created += 1;
    }
  }

  if (settings.enableMaintenanceRule) {
    for (const machine of data.machines) {
      if (machine.nextMaintenanceHours > 16 && machine.status !== "maintenance") continue;
      const key = `maint:${machine.id}`;
      if (openDuplicate(next, "schedule_maintenance", key)) continue;
      const before = next.decisions.length;
      next = upsertDecision(next, {
        type: "schedule_maintenance",
        title: `Schedule maintenance · ${machine.name}`,
        reason: `Only ${machine.nextMaintenanceHours}h to PM window (status: ${machine.status}).`,
        source: "rule",
        severity:
          machine.status === "down" || machine.status === "maintenance" ? "critical" : "warning",
        autoExecutable: true,
        dedupeKey: key,
        payload: { machineId: machine.id, machineName: machine.name },
      });
      if (next.decisions.length > before) created += 1;
    }
  }

  if (settings.enableMarginRule) {
    const trend = data.revenueTrend;
    if (trend.length >= 2) {
      const latest = trend[trend.length - 1];
      const prev = trend[trend.length - 2];
      const latestMargin = latest.revenue ? latest.profit / latest.revenue : 0;
      const prevMargin = prev.revenue ? prev.profit / prev.revenue : 0;
      if (latestMargin + 0.02 < prevMargin) {
        const key = `margin:${latest.month}`;
        if (!openDuplicate(next, "flag_margin", key)) {
          const before = next.decisions.length;
          next = upsertDecision(next, {
            type: "flag_margin",
            title: `Margin drop in ${latest.month}`,
            reason: `Gross margin fell from ${(prevMargin * 100).toFixed(1)}% to ${(latestMargin * 100).toFixed(1)}%. Investigate COGS/scrap.`,
            source: "rule",
            severity: "warning",
            autoExecutable: false,
            dedupeKey: key,
            payload: {
              month: latest.month,
              margin: Number((latestMargin * 100).toFixed(1)),
              previousMargin: Number((prevMargin * 100).toFixed(1)),
            },
          });
          if (next.decisions.length > before) created += 1;
        }
      }
    }
  }

  for (const so of data.salesOrders) {
    if (!["ready", "dispatched"].includes(so.status)) continue;
    const key = `invoice:${so.id}`;
    if (openDuplicate(next, "create_invoice", key)) continue;
    const before = next.decisions.length;
    next = upsertDecision(next, {
      type: "create_invoice",
      title: `Invoice ${so.number}`,
      reason: "Order is ready/dispatched and needs a receivable invoice.",
      source: "rule",
      severity: "info",
      autoExecutable: true,
      dedupeKey: key,
      payload: { salesOrderId: so.id, salesOrderNumber: so.number },
    });
    if (next.decisions.length > before) created += 1;
  }

  return { data: next, created };
}

/** Phase 4 — execute one decision action against the system of record. */
export function executeDecision(data: AppData, decisionId: string): MutationResult {
  const decision = data.decisions.find((d) => d.id === decisionId);
  if (!decision) throw new Error("Decision not found");
  if (!["proposed", "approved"].includes(decision.status)) {
    throw new Error(`Decision cannot be executed from status ${decision.status}`);
  }

  let working = data;
  let message = "";

  switch (decision.type) {
    case "create_purchase_request": {
      const productionOrderId = String(decision.payload.productionOrderId ?? "");
      const result = createPurchaseFromShortage(working, productionOrderId);
      working = result.data;
      message = result.message;
      break;
    }
    case "hold_dispatch":
    case "credit_hold": {
      const salesOrderId = String(decision.payload.salesOrderId ?? "");
      const salesOrderNumber = String(decision.payload.salesOrderNumber ?? "");
      working = {
        ...working,
        dispatchHolds: Array.from(
          new Set([...working.dispatchHolds, salesOrderId, salesOrderNumber].filter(Boolean))
        ),
        alerts: [
          {
            id: `a_${Date.now()}`,
            severity: "critical",
            module: "Warehouse",
            title: `Dispatch hold · ${salesOrderNumber || salesOrderId}`,
            detail: decision.reason,
            time: "just now",
          },
          ...working.alerts,
        ],
      };
      message = `Dispatch held for ${salesOrderNumber || salesOrderId}`;
      break;
    }
    case "block_qc_release": {
      const reference = String(decision.payload.reference ?? "");
      working = {
        ...working,
        qcBlocks: Array.from(new Set([...working.qcBlocks, reference].filter(Boolean))),
        productionOrders: working.productionOrders.map((p) =>
          p.number === reference || p.id === reference
            ? { ...p, status: "quality_check" as const }
            : p
        ),
        alerts: [
          {
            id: `a_${Date.now()}`,
            severity: "critical",
            module: "Quality",
            title: `QC release blocked · ${reference}`,
            detail: decision.reason,
            time: "just now",
          },
          ...working.alerts,
        ],
      };
      message = `QC block applied to ${reference}`;
      break;
    }
    case "create_invoice": {
      const salesOrderId = String(decision.payload.salesOrderId ?? "");
      const result = invoiceFromSalesOrder(working, salesOrderId);
      working = result.data;
      message = result.message;
      break;
    }
    case "schedule_maintenance": {
      const machineId = String(decision.payload.machineId ?? "");
      const machine = working.machines.find((m) => m.id === machineId);
      working = {
        ...working,
        machines: working.machines.map((m) =>
          m.id === machineId ? { ...m, status: "maintenance" as const } : m
        ),
        maintenance: [
          {
            id: `mt_${Date.now()}`,
            machineId,
            type: "preventive",
            problem: "Decision engine scheduled preventive maintenance",
            reportedBy: "Forge Decision OS",
            date: new Date().toISOString().slice(0, 10),
            technician: "Unassigned",
            partsCost: 0,
            downtimeHours: 0,
            resolution: "Scheduled from decision center",
            status: "open",
          },
          ...working.maintenance,
        ],
        alerts: [
          {
            id: `a_${Date.now()}`,
            severity: "warning",
            module: "Maintenance",
            title: `Maintenance scheduled · ${machine?.name ?? machineId}`,
            detail: decision.reason,
            time: "just now",
          },
          ...working.alerts,
        ],
      };
      message = `Maintenance scheduled for ${machine?.name ?? machineId}`;
      break;
    }
    case "flag_margin": {
      working = {
        ...working,
        alerts: [
          {
            id: `a_${Date.now()}`,
            severity: "warning",
            module: "Finance",
            title: decision.title,
            detail: decision.reason,
            time: "just now",
          },
          ...working.alerts,
        ],
      };
      message = "Margin risk flagged for management review";
      break;
    }
    default:
      throw new Error("Unsupported decision type");
  }

  const stamp = new Date().toISOString();
  working = {
    ...working,
    decisions: working.decisions.map((d) =>
      d.id === decisionId
        ? {
            ...d,
            status: "executed" as const,
            updatedAt: stamp,
            resultMessage: message,
          }
        : d
    ),
  };

  return { data: working, message };
}

export function approveDecision(data: AppData, decisionId: string): MutationResult {
  const decision = data.decisions.find((d) => d.id === decisionId);
  if (!decision) throw new Error("Decision not found");
  if (decision.status !== "proposed") throw new Error("Only proposed decisions can be approved");
  return {
    message: `Approved · ${decision.title}`,
    data: {
      ...data,
      decisions: data.decisions.map((d) =>
        d.id === decisionId
          ? { ...d, status: "approved" as const, updatedAt: new Date().toISOString() }
          : d
      ),
    },
  };
}

export function rejectDecision(data: AppData, decisionId: string): MutationResult {
  const decision = data.decisions.find((d) => d.id === decisionId);
  if (!decision) throw new Error("Decision not found");
  if (!["proposed", "approved"].includes(decision.status)) {
    throw new Error("Decision cannot be rejected in current status");
  }
  return {
    message: `Rejected · ${decision.title}`,
    data: {
      ...data,
      decisions: data.decisions.map((d) =>
        d.id === decisionId
          ? { ...d, status: "rejected" as const, updatedAt: new Date().toISOString() }
          : d
      ),
    },
  };
}

export function overrideDecision(data: AppData, decisionId: string): MutationResult {
  const decision = data.decisions.find((d) => d.id === decisionId);
  if (!decision) throw new Error("Decision not found");

  let working = data;
  if (decision.type === "hold_dispatch" || decision.type === "credit_hold") {
    const salesOrderId = String(decision.payload.salesOrderId ?? "");
    const salesOrderNumber = String(decision.payload.salesOrderNumber ?? "");
    working = {
      ...working,
      dispatchHolds: working.dispatchHolds.filter(
        (h) => h !== salesOrderId && h !== salesOrderNumber
      ),
    };
  }
  if (decision.type === "block_qc_release") {
    const reference = String(decision.payload.reference ?? "");
    working = {
      ...working,
      qcBlocks: working.qcBlocks.filter((h) => h !== reference),
    };
  }

  return {
    message: `Human override cleared · ${decision.title}`,
    data: {
      ...working,
      decisions: working.decisions.map((d) =>
        d.id === decisionId
          ? {
              ...d,
              status: "overridden" as const,
              updatedAt: new Date().toISOString(),
              resultMessage: "Overridden by human operator",
            }
          : d
      ),
      alerts: [
        {
          id: `a_${Date.now()}`,
          severity: "warning",
          module: "Decisions",
          title: `Override · ${decision.title}`,
          detail: "Operator overrode automated decision control",
          time: "just now",
        },
        ...working.alerts,
      ],
    },
  };
}

export function autoExecuteEligible(data: AppData): MutationResult {
  if (!data.decisionSettings.autoExecute) {
    return { data, message: "Auto-execute is disabled" };
  }

  let working = data;
  let count = 0;

  const eligible = working.decisions.filter((d) => d.status === "proposed");
  for (const decision of eligible) {
    const needsApproval =
      working.decisionSettings.requireApprovalForCritical && decision.severity === "critical";
    if (needsApproval) continue;
    if (!decision.autoExecutable) continue;
    try {
      const result = executeDecision(working, decision.id);
      working = result.data;
      count += 1;
    } catch {
      working = {
        ...working,
        decisions: working.decisions.map((d) =>
          d.id === decision.id
            ? {
                ...d,
                status: "failed" as const,
                updatedAt: new Date().toISOString(),
                resultMessage: "Auto-execute failed",
              }
            : d
        ),
      };
    }
  }

  return {
    data: working,
    message: count
      ? `Auto-executed ${count} decision(s)`
      : "No eligible decisions to auto-execute",
  };
}

export { completeProduction, invoiceFromSalesOrder, receivePurchaseOrder };
