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
import { getSession } from "./auth";
import {
  buildEmptyTenant,
  readCompanyTenant,
  writeCompanyTenant,
  getCompany,
  getRegistryUser,
} from "./tenancy";
import { seedData } from "./seed";
import { applySupervisorAction, type SupervisorAction } from "./supervisor";

async function requireCompanyId() {
  const session = await getSession();
  if (!session?.companyId) throw new Error("Unauthorized");
  return session;
}

export async function readTenant(): Promise<AppData> {
  const session = await requireCompanyId();
  const raw = await readCompanyTenant(session.companyId);
  const data = migrateTenant(raw);
  const user = await getRegistryUser(session.companyId, session.userId);
  if (user) {
    data.user = {
      id: user.id,
      companyId: user.companyId,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      avatarInitials: user.avatarInitials,
    };
  }
  return data;
}

export async function writeTenant(data: AppData): Promise<AppData> {
  const session = await requireCompanyId();
  const migrated = migrateTenant(data);
  await writeCompanyTenant(session.companyId, migrated);
  return migrated;
}

export async function resetTenant(): Promise<AppData> {
  const session = await requireCompanyId();
  const company = await getCompany(session.companyId);
  const user = await getRegistryUser(session.companyId, session.userId);
  if (!company || !user) throw new Error("Tenant not found");

  if (company.id === "co_apex") {
    const data = migrateTenant({
      ...structuredClone(seedData),
      company: {
        ...seedData.company,
        id: company.id,
        onboardingCompleted: true,
        createdAt: company.createdAt,
        country: company.country,
        employeeBand: company.employeeBand,
      },
      user: {
        id: user.id,
        companyId: user.companyId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatarInitials: user.avatarInitials,
      },
    });
    await writeCompanyTenant(company.id, data);
    return data;
  }

  const data = migrateTenant(
    buildEmptyTenant({
      company: {
        id: company.id,
        name: company.name,
        industry: company.industry,
        plan: company.plan,
        plants: company.plants,
        createdAt: company.createdAt,
        onboardingCompleted: company.onboardingCompleted,
        country: company.country,
        employeeBand: company.employeeBand,
      },
      owner: {
        id: user.id,
        companyId: user.companyId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatarInitials: user.avatarInitials,
      },
    })
  );
  await writeCompanyTenant(company.id, data);
  return data;
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

export async function mutateSupervisorEntry(input: SupervisorAction) {
  const current = await readTenant();
  return commit(applySupervisorAction(current, input, current.user.name));
}
