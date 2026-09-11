import type { Role } from "./types";
import { appNavGroups, type NavGroup } from "./nav";

/** Modules a role may open in the app shell. */
const ROLE_PATHS: Record<Role, string[]> = {
  owner: ["*"],
  admin: ["*"],
  sales_manager: ["/app", "/app/supervisor", "/app/sales", "/app/ai"],
  salesperson: ["/app", "/app/supervisor", "/app/sales", "/app/ai"],
  purchase_manager: ["/app", "/app/supervisor", "/app/purchase", "/app/inventory", "/app/ai"],
  store_manager: [
    "/app",
    "/app/supervisor",
    "/app/inventory",
    "/app/warehouse",
    "/app/purchase",
    "/app/ai",
  ],
  production_manager: [
    "/app",
    "/app/supervisor",
    "/app/production",
    "/app/inventory",
    "/app/ai",
  ],
  qc_manager: ["/app", "/app/supervisor", "/app/quality", "/app/production", "/app/ai"],
  accountant: ["/app", "/app/supervisor", "/app/accounts", "/app/reports", "/app/ai"],
  hr_manager: ["/app", "/app/supervisor", "/app/hr", "/app/ai"],
  worker: ["/app", "/app/supervisor", "/app/production", "/app/ai"],
};

export type SupervisorDesk =
  | "sales"
  | "purchase"
  | "inventory"
  | "production"
  | "quality"
  | "warehouse"
  | "accounts"
  | "hr";

const ROLE_DESKS: Record<Role, SupervisorDesk[]> = {
  owner: ["sales", "purchase", "inventory", "production", "quality", "warehouse", "accounts", "hr"],
  admin: ["sales", "purchase", "inventory", "production", "quality", "warehouse", "accounts", "hr"],
  sales_manager: ["sales"],
  salesperson: ["sales"],
  purchase_manager: ["purchase"],
  store_manager: ["inventory", "warehouse"],
  production_manager: ["production"],
  qc_manager: ["quality"],
  accountant: ["accounts"],
  hr_manager: ["hr"],
  worker: ["production"],
};

export function isOwnerLike(role: Role) {
  return role === "owner" || role === "admin";
}

export function canAccessPath(role: Role, pathname: string) {
  const allowed = ROLE_PATHS[role] ?? ["/app"];
  if (allowed.includes("*")) return true;
  return allowed.some((path) =>
    path === "/app" ? pathname === "/app" : pathname === path || pathname.startsWith(`${path}/`)
  );
}

export function navForRole(role: Role): NavGroup[] {
  return appNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessPath(role, item.href)),
    }))
    .filter((group) => group.items.length > 0);
}

export function desksForRole(role: Role): SupervisorDesk[] {
  return ROLE_DESKS[role] ?? ["production"];
}

export function homeForRole(role: Role) {
  return isOwnerLike(role) ? "/app" : "/app/supervisor";
}

export const deskLabels: Record<SupervisorDesk, string> = {
  sales: "Sales",
  purchase: "Purchase",
  inventory: "Inventory / Stores",
  production: "Production",
  quality: "Quality Control",
  warehouse: "Warehouse",
  accounts: "Accounts",
  hr: "HR & Payroll",
};
