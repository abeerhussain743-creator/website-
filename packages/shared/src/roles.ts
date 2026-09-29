import { MEMBERSHIP_ROLES } from "./constants.js";

export type Role = (typeof MEMBERSHIP_ROLES)[number];
export type MembershipRole = Role;

const rank: Record<Role, number> = {
  OWNER: 100,
  ADMIN: 80,
  EDITOR: 50,
  CLIENT_APPROVER: 20,
};

export function roleAtLeast(role: Role, minimum: Role): boolean {
  return rank[role] >= rank[minimum];
}

export function canManageBilling(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canEditContent(role: Role): boolean {
  return roleAtLeast(role, "EDITOR");
}

export function canApproveOnly(role: Role): boolean {
  return role === "CLIENT_APPROVER";
}

export function isMembershipRole(value: string): value is Role {
  return (MEMBERSHIP_ROLES as readonly string[]).includes(value);
}
