export type FeatureFlag =
  | "admissions"
  | "fees"
  | "attendance"
  | "whatsapp_inbox"
  | "briefing"
  | "ai_admissions"
  | "ai_tutor"
  | "voice_calls";

export type LimitMetric =
  | "students"
  | "branches"
  | "whatsapp_messages"
  | "ai_tutor_seats"
  | "voice_minutes";

export type EntitlementRow = {
  feature: string;
  enabled: boolean;
  limit: number | null;
};

export type EntitlementOverride = {
  feature: string;
  enabled: boolean | null;
  limit: number | null;
};

export function resolveEntitlements(
  planRows: EntitlementRow[],
  overrides: EntitlementOverride[] = [],
): Map<string, { enabled: boolean; limit: number | null }> {
  const map = new Map<string, { enabled: boolean; limit: number | null }>();
  for (const row of planRows) {
    map.set(row.feature, { enabled: row.enabled, limit: row.limit });
  }
  for (const o of overrides) {
    const current = map.get(o.feature) ?? { enabled: false, limit: null };
    map.set(o.feature, {
      enabled: o.enabled ?? current.enabled,
      limit: o.limit ?? current.limit,
    });
  }
  return map;
}

export function hasFeature(
  entitlements: Map<string, { enabled: boolean; limit: number | null }>,
  feature: FeatureFlag | string,
): boolean {
  return entitlements.get(feature)?.enabled === true;
}

export function withinLimit(
  entitlements: Map<string, { enabled: boolean; limit: number | null }>,
  metric: LimitMetric | string,
  currentUsage: number,
): boolean {
  const row = entitlements.get(metric);
  if (!row || !row.enabled) return false;
  if (row.limit == null) return true;
  return currentUsage < row.limit;
}
