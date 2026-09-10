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
