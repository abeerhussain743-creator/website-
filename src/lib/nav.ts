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
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  short?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const appNavGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/app", label: "Dashboard", icon: LayoutDashboard, short: "Home" }],
  },
  {
    label: "Sell & Buy",
    items: [
      { href: "/app/sales", label: "CRM & Sales", icon: Users, short: "Sales" },
      { href: "/app/purchase", label: "Purchase", icon: ShoppingCart },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/app/inventory", label: "Inventory", icon: Package },
      { href: "/app/production", label: "Production", icon: Factory },
      { href: "/app/quality", label: "Quality", icon: BadgeCheck },
      { href: "/app/warehouse", label: "Warehouse", icon: Warehouse },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/app/accounts", label: "Accounts", icon: Landmark },
      { href: "/app/hr", label: "HR & Payroll", icon: UserRound, short: "HR" },
      { href: "/app/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/app/ai", label: "AI Copilot", icon: Sparkles },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const appNav = appNavGroups.flatMap((g) => g.items);

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
