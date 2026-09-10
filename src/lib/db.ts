import { promises as fs } from "fs";
import path from "path";
import { seedData } from "./seed";
import type { AppData, DecisionSettings } from "./types";
import { migrateTenant } from "./migrate";
import {
  convertQuotation,
  createPurchaseFromShortage,
  startProduction,
} from "./mutations";
import {
  approveDecision,
  autoExecuteEligible,
  completeProduction,
  executeDecision,
  invoiceFromSalesOrder,
  overrideDecision,
  receivePurchaseOrder,
  rejectDecision,
  runDecisionRules,
} from "./decisions";
import { dispatchSalesOrder } from "./workflows";
import { analyzeTenant, answerQuestion } from "./ai";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "tenant.json");

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(seedData, null, 2), "utf8");
  }
}

export async function readTenant(): Promise<AppData> {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  return migrateTenant(JSON.parse(raw) as AppData);
}

export async function writeTenant(data: AppData): Promise<AppData> {
  await ensureStore();
  const migrated = migrateTenant(data);
  await fs.writeFile(DATA_FILE, JSON.stringify(migrated, null, 2), "utf8");
  return migrated;
}

export async function resetTenant(): Promise<AppData> {
  return writeTenant(structuredClone(seedData));
}

async function commit(result: { data: AppData; message: string }) {
  const data = await writeTenant(result.data);
  return { data, message: result.message };
}

export async function mutateConvertQuotation(quotationId: string) {
  return commit(convertQuotation(await readTenant(), quotationId));
}

export async function mutateStartProduction(productionOrderId: string) {
  return commit(startProduction(await readTenant(), productionOrderId));
}

export async function mutateShortagePurchase(productionOrderId: string) {
  return commit(createPurchaseFromShortage(await readTenant(), productionOrderId));
}

export async function mutateCompleteProduction(productionOrderId: string) {
  return commit(completeProduction(await readTenant(), productionOrderId));
}

export async function mutateReceivePurchase(purchaseOrderId: string) {
  return commit(receivePurchaseOrder(await readTenant(), purchaseOrderId));
}

export async function mutateInvoiceSalesOrder(salesOrderId: string) {
  return commit(invoiceFromSalesOrder(await readTenant(), salesOrderId));
}

export async function mutateDispatchSalesOrder(salesOrderId: string) {
  return commit(dispatchSalesOrder(await readTenant(), salesOrderId));
}

export async function mutateRunRules() {
  const current = await readTenant();
  const { data, created } = runDecisionRules(current);
  await writeTenant(data);
  return { data, message: `Rule engine proposed ${created} new decision(s)`, created };
}

export async function mutateAnalyze() {
  const current = await readTenant();
  const { data, insights } = analyzeTenant(current);
  const withRules = runDecisionRules(data);
  await writeTenant(withRules.data);
  return {
    data: withRules.data,
    insights,
    message: `AI analyzed tenant · ${insights.length} insights · ${withRules.created} new rule decisions`,
  };
}

export async function mutateAsk(question: string) {
  const current = await readTenant();
  const insight = answerQuestion(current, question);
  const data = await writeTenant({
    ...current,
    aiInsights: [insight, ...current.aiInsights.filter((i) => i.id !== insight.id)],
  });
  return { insight, data, message: `Answered: ${insight.question}` };
}

export async function mutateApprove(decisionId: string) {
  return commit(approveDecision(await readTenant(), decisionId));
}

export async function mutateReject(decisionId: string) {
  return commit(rejectDecision(await readTenant(), decisionId));
}

export async function mutateExecute(decisionId: string) {
  return commit(executeDecision(await readTenant(), decisionId));
}

export async function mutateOverride(decisionId: string) {
  return commit(overrideDecision(await readTenant(), decisionId));
}

export async function mutateAutoExecute() {
  const ruled = runDecisionRules(await readTenant());
  return commit(autoExecuteEligible(ruled.data));
}

export async function mutateUpdateSettings(patch: Partial<DecisionSettings>) {
  const current = await readTenant();
  const data = await writeTenant({
    ...current,
    decisionSettings: { ...current.decisionSettings, ...patch },
  });
  return { data, message: "Decision settings updated" };
}
