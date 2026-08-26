import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Factory,
  BadgeCheck,
  Warehouse,
  Landmark,
  UserRound,
  BarChart3,
  Sparkles,
  Settings,
  Boxes,
} from "lucide-react";

export const appNav = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/sales", label: "CRM & Sales", icon: Users },
  { href: "/app/purchase", label: "Purchase", icon: ShoppingCart },
  { href: "/app/inventory", label: "Inventory", icon: Package },
  { href: "/app/production", label: "Production", icon: Factory },
  { href: "/app/quality", label: "Quality", icon: BadgeCheck },
  { href: "/app/warehouse", label: "Warehouse", icon: Warehouse },
  { href: "/app/accounts", label: "Accounts", icon: Landmark },
  { href: "/app/hr", label: "HR & Payroll", icon: UserRound },
  { href: "/app/reports", label: "Reports", icon: BarChart3 },
  { href: "/app/ai", label: "AI Copilot", icon: Sparkles },
  { href: "/app/settings", label: "Settings", icon: Settings },
] as const;

export const moduleMeta = {
  dashboard: { phase: 1, title: "Dashboard" },
  sales: { phase: 1, title: "CRM & Sales" },
  purchase: { phase: 1, title: "Purchase" },
  inventory: { phase: 1, title: "Inventory / Stores" },
  production: { phase: 1, title: "Production" },
  quality: { phase: 2, title: "Quality Control" },
  warehouse: { phase: 2, title: "Warehouse & Dispatch" },
  accounts: { phase: 1, title: "Accounts & Finance" },
  hr: { phase: 3, title: "HR & Payroll" },
  reports: { phase: 2, title: "Reports & Analytics" },
  ai: { phase: 4, title: "AI & Automation" },
  settings: { phase: 1, title: "Admin & Settings" },
} as const;

export { Boxes };
