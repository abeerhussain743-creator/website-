import type { AppData, DecisionSettings } from "./types";

export const defaultDecisionSettings: DecisionSettings = {
  autoExecute: false,
  requireApprovalForCritical: true,
  enableShortageRule: true,
  enableOverdueHoldRule: true,
  enableQcBlockRule: true,
  enableMaintenanceRule: true,
  enableMarginRule: true,
};

/** Ensure older tenant.json files gain Phase 2–4 fields without crashing. */
export function migrateTenant(data: AppData): AppData {
  return {
    ...data,
    company: {
      ...data.company,
      onboardingCompleted: data.company?.onboardingCompleted ?? true,
      createdAt: data.company?.createdAt,
      country: data.company?.country,
      employeeBand: data.company?.employeeBand,
    },
    decisions: Array.isArray(data.decisions) ? data.decisions : [],
    decisionSettings: {
      ...defaultDecisionSettings,
      ...(data.decisionSettings ?? {}),
    },
    dispatchHolds: Array.isArray(data.dispatchHolds) ? data.dispatchHolds : [],
    qcBlocks: Array.isArray(data.qcBlocks) ? data.qcBlocks : [],
    aiInsights: Array.isArray(data.aiInsights) ? data.aiInsights : [],
    alerts: Array.isArray(data.alerts) ? data.alerts : [],
  };
}
