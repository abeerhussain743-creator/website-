export type Permission =
  | "students.read"
  | "students.write"
  | "students.export"
  | "guardians.read"
  | "guardians.write"
  | "admissions.read"
  | "admissions.write"
  | "fees.read"
  | "fees.write"
  | "fees.collect"
  | "attendance.read"
  | "attendance.write"
  | "inbox.read"
  | "inbox.write"
  | "broadcasts.send"
  | "settings.read"
  | "settings.write"
  | "staff.manage"
  | "roles.manage"
  | "audit.read"
  | "reports.read"
  | "billing.read";

export const ALL_PERMISSIONS: Permission[] = [
  "students.read",
  "students.write",
  "students.export",
  "guardians.read",
  "guardians.write",
  "admissions.read",
  "admissions.write",
  "fees.read",
  "fees.write",
  "fees.collect",
  "attendance.read",
  "attendance.write",
  "inbox.read",
  "inbox.write",
  "broadcasts.send",
  "settings.read",
  "settings.write",
  "staff.manage",
  "roles.manage",
  "audit.read",
  "reports.read",
  "billing.read",
];

export type SystemRoleName =
  | "OWNER"
  | "PRINCIPAL"
  | "ADMIN"
  | "ACCOUNTANT"
  | "TEACHER";

export const DEFAULT_PERMISSIONS: Record<SystemRoleName, Permission[]> = {
  OWNER: [...ALL_PERMISSIONS],
  PRINCIPAL: [
    "students.read",
    "students.write",
    "students.export",
    "guardians.read",
    "guardians.write",
    "admissions.read",
    "admissions.write",
    "fees.read",
    "attendance.read",
    "attendance.write",
    "inbox.read",
    "inbox.write",
    "broadcasts.send",
    "settings.read",
    "reports.read",
    "audit.read",
  ],
  ADMIN: [
    "students.read",
    "students.write",
    "students.export",
    "guardians.read",
    "guardians.write",
    "admissions.read",
    "admissions.write",
    "fees.read",
    "fees.write",
    "fees.collect",
    "attendance.read",
    "inbox.read",
    "inbox.write",
    "broadcasts.send",
    "settings.read",
  ],
  ACCOUNTANT: [
    "students.read",
    "guardians.read",
    "fees.read",
    "fees.write",
    "fees.collect",
    "reports.read",
  ],
  TEACHER: [
    "students.read",
    "attendance.read",
    "attendance.write",
    "inbox.read",
  ],
};

export function hasPermission(
  granted: readonly string[],
  required: Permission,
): boolean {
  return granted.includes(required);
}

export function assertPermission(
  granted: readonly string[],
  required: Permission,
): void {
  if (!hasPermission(granted, required)) {
    throw new Error(`Forbidden: missing permission ${required}`);
  }
}
