import type { AppData, AiInsight } from "./types";
import { upsertDecision } from "./workflows";

function money(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

/** Phase 3 — analyze live tenant data and produce explainable insights + recommended decisions. */
export function analyzeTenant(data: AppData): {
  insights: AiInsight[];
  data: AppData;
} {
  const insights: AiInsight[] = [];
  let working = data;

  const trend = data.revenueTrend;
  if (trend.length >= 2) {
    const latest = trend[trend.length - 1];
    const prev = trend[trend.length - 2];
    const profitDelta = prev.profit ? (latest.profit - prev.profit) / prev.profit : 0;
    const cogsDelta = prev.cogs ? (latest.cogs - prev.cogs) / prev.cogs : 0;
    const margin = latest.revenue ? latest.profit / latest.revenue : 0;
    const prevMargin = prev.revenue ? prev.profit / prev.revenue : 0;

    insights.push({
      id: "live_profit",
      question: "Why did profit change this month?",
      answer:
        profitDelta < 0
          ? `Gross profit ${pct(profitDelta)} vs ${prev.month}. COGS moved ${pct(cogsDelta)}. Margin ${pct(margin)} (was ${pct(prevMargin)}). Primary pressure is cost inflation and/or scrap — review steel POs and QC rejection lots.`
          : `Gross profit improved ${pct(profitDelta)} vs ${prev.month}. Margin is ${pct(margin)}. Keep monitoring steel unit cost and Line 2 efficiency so gains hold.`,
      metrics: [
        { label: "Profit Δ", value: pct(profitDelta), trend: profitDelta < 0 ? "down" : "up" },
        { label: "COGS Δ", value: pct(cogsDelta), trend: cogsDelta > 0 ? "up" : "down" },
        { label: "Gross margin", value: pct(margin), trend: margin < prevMargin ? "down" : "up" },
        { label: "Revenue", value: money(latest.revenue), trend: "flat" },
      ],
    });

    if (margin + 0.02 < prevMargin) {
      working = upsertDecision(working, {
        type: "flag_margin",
        title: `AI · Margin decline in ${latest.month}`,
        reason: insights[0].answer,
        source: "ai",
        severity: "warning",
        autoExecutable: false,
        dedupeKey: `ai-margin:${latest.month}`,
        payload: { month: latest.month, margin: Number((margin * 100).toFixed(1)) },
      });
    }
  }

  // Steel cover / shortage
  const steel = data.products.find((p) => p.id === "p_steel");
  const openProd = data.productionOrders.filter((p) =>
    ["materials_check", "ready", "in_production", "delayed"].includes(p.status)
  );
  let steelDemand = 0;
  for (const po of openProd) {
    const bom = data.boms.find((b) => b.productId === po.productId);
    const line = bom?.lines.find((l) => l.productId === "p_steel");
    if (line) steelDemand += line.quantity * po.quantity;
  }
  const steelAvail = steel ? steel.quantity - steel.reserved : 0;
  const daysCover =
    steelDemand > 0 ? Math.max(1, Math.round((steelAvail / steelDemand) * 14)) : 30;
  insights.push({
    id: "live_steel",
    question: "Will we run out of steel?",
    answer:
      steelAvail < steelDemand
        ? `Steel cover is tight: available ${steelAvail.toLocaleString()} KG vs open demand ${steelDemand.toLocaleString()} KG (~${daysCover} days at current mix). Decision OS should create/approve shortage purchase requests before starting delayed jobs.`
        : `Steel cover looks adequate for open production (${steelAvail.toLocaleString()} KG available vs ${steelDemand.toLocaleString()} KG demand).`,
    metrics: [
      { label: "Available", value: `${steelAvail.toLocaleString()} KG`, trend: "down" },
      { label: "Open demand", value: `${steelDemand.toLocaleString()} KG`, trend: "up" },
      { label: "Days of cover", value: `${daysCover} days`, trend: daysCover < 10 ? "down" : "flat" },
    ],
  });

  for (const po of openProd.filter((p) => !p.materialsReady)) {
    working = upsertDecision(working, {
      type: "create_purchase_request",
      title: `AI · Buy materials for ${po.number}`,
      reason: insights.find((i) => i.id === "live_steel")?.answer ?? "Material shortage detected",
      source: "ai",
      severity: "critical",
      autoExecutable: true,
      dedupeKey: `ai-shortage:${po.id}`,
      payload: { productionOrderId: po.id, productionOrderNumber: po.number },
    });
  }

  // Line efficiency
  const running = data.machines.filter((m) => m.efficiency > 0);
  const avg =
    running.reduce((s, m) => s + m.efficiency, 0) / Math.max(1, running.length);
  const worst = [...running].sort((a, b) => a.efficiency - b.efficiency)[0];
  if (worst) {
    const gap = avg - worst.efficiency;
    insights.push({
      id: "live_line",
      question: "Which line is underperforming?",
      answer: `${worst.name} is at ${worst.efficiency}% vs plant average ${Math.round(avg)}% (gap ${gap.toFixed(0)} pts). ${
        worst.nextMaintenanceHours <= 16
          ? "Maintenance window is near — schedule PM and inspect rework causes."
          : "Check scrap codes and staffing on this cell."
      }`,
      metrics: [
        { label: worst.name, value: `${worst.efficiency}%`, trend: "down" },
        { label: "Plant average", value: `${Math.round(avg)}%`, trend: "flat" },
        { label: "Gap", value: `-${gap.toFixed(0)}%`, trend: "down" },
      ],
    });
    if (worst.nextMaintenanceHours <= 16) {
      working = upsertDecision(working, {
        type: "schedule_maintenance",
        title: `AI · Maintain ${worst.name}`,
        reason: insights.find((i) => i.id === "live_line")?.answer ?? "Efficiency gap",
        source: "ai",
        severity: "warning",
        autoExecutable: true,
        dedupeKey: `ai-maint:${worst.id}`,
        payload: { machineId: worst.id, machineName: worst.name },
      });
    }
  }

  // Overdue AR
  const overdue = data.invoices.filter((i) => i.type === "receivable" && i.status === "overdue");
  if (overdue.length) {
    const total = overdue.reduce((s, i) => s + (i.amount - i.paid), 0);
    insights.push({
      id: "live_ar",
      question: "Where is cash trapped in receivables?",
      answer: `${overdue.length} overdue receivable(s) totaling ${money(total)}. Top: ${overdue[0].partyName} ${overdue[0].number}. Decision OS can hold related dispatches until payment risk clears.`,
      metrics: [
        { label: "Overdue invoices", value: String(overdue.length), trend: "up" },
        { label: "Overdue $", value: money(total), trend: "up" },
        { label: "Top debtor", value: overdue[0].partyName, trend: "flat" },
      ],
    });
  }

  // QC
  const fails = data.qualityChecks.filter((q) => q.status === "fail");
  if (fails.length) {
    insights.push({
      id: "live_qc",
      question: "What quality issues need decisions now?",
      answer: `${fails.length} failed inspection(s). Latest: ${fails[0].reference} — ${fails[0].defect ?? "defect logged"} (${fails[0].rejected} rejected). Block release until CAPA closes.`,
      metrics: [
        { label: "Failed checks", value: String(fails.length), trend: "up" },
        { label: "Latest ref", value: fails[0].reference, trend: "flat" },
        {
          label: "Rejection qty",
          value: String(fails.reduce((s, q) => s + q.rejected, 0)),
          trend: "up",
        },
      ],
    });
  }

  return {
    insights,
    data: {
      ...working,
      aiInsights: insights,
    },
  };
}

export function answerQuestion(data: AppData, question: string): AiInsight {
  const q = question.toLowerCase();
  const analyzed = analyzeTenant(data).insights;

  if (q.includes("profit") || q.includes("margin")) {
    return analyzed.find((i) => i.id === "live_profit") ?? analyzed[0];
  }
  if (q.includes("steel") || q.includes("stock") || q.includes("inventory") || q.includes("run out")) {
    return analyzed.find((i) => i.id === "live_steel") ?? analyzed[0];
  }
  if (q.includes("line") || q.includes("efficien") || q.includes("machine")) {
    return analyzed.find((i) => i.id === "live_line") ?? analyzed[0];
  }
  if (q.includes("cash") || q.includes("receivable") || q.includes("overdue") || q.includes("payment")) {
    return analyzed.find((i) => i.id === "live_ar") ?? analyzed[0];
  }
  if (q.includes("quality") || q.includes("qc") || q.includes("scrap") || q.includes("defect")) {
    return analyzed.find((i) => i.id === "live_qc") ?? analyzed[0];
  }

  const openDecisions = data.decisions.filter((d) =>
    ["proposed", "approved"].includes(d.status)
  ).length;
  return {
    id: "live_general",
    question,
    answer: `I analyzed Apex Metalworks live data: ${data.metrics.lowStockItems} low-stock SKUs, ${money(data.metrics.receivables)} AR, ${data.productionOrders.filter((p) => p.status !== "completed").length} open production orders, and ${openDecisions} open decisions. Ask about profit, steel cover, line efficiency, overdue cash, or quality for a deeper brief.`,
    metrics: [
      { label: "Low stock", value: String(data.metrics.lowStockItems) },
      { label: "AR", value: money(data.metrics.receivables) },
      { label: "Open decisions", value: String(openDecisions) },
    ],
  };
}
