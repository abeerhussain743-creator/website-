export function money(n: number, compact = false) {
  if (compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function moneyExact(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

export function num(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function pct(n: number) {
  return `${n}%`;
}

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  sales_manager: "Sales Manager",
  salesperson: "Salesperson",
  purchase_manager: "Purchase Manager",
  store_manager: "Store Manager",
  production_manager: "Production Manager",
  qc_manager: "QC Manager",
  accountant: "Accountant",
  hr_manager: "HR Manager",
  worker: "Worker",
};

export const categoryLabels: Record<string, string> = {
  raw_material: "Raw Material",
  wip: "Work in Progress",
  finished_goods: "Finished Goods",
  scrap: "Scrap",
  packaging: "Packaging",
  component: "Component",
};

export const statusTone: Record<string, string> = {
  running: "tone-ok",
  idle: "tone-muted",
  maintenance: "tone-warn",
  down: "tone-bad",
  ready: "tone-ok",
  in_production: "tone-info",
  delayed: "tone-bad",
  completed: "tone-ok",
  quality_check: "tone-warn",
  materials_check: "tone-warn",
  draft: "tone-muted",
  confirmed: "tone-info",
  dispatched: "tone-ok",
  invoiced: "tone-info",
  paid: "tone-ok",
  open: "tone-info",
  partial: "tone-warn",
  overdue: "tone-bad",
  pass: "tone-ok",
  fail: "tone-bad",
  conditional: "tone-warn",
  sent: "tone-info",
  accepted: "tone-ok",
  rejected: "tone-bad",
  converted: "tone-ok",
  ordered: "tone-info",
  received: "tone-ok",
  inspected: "tone-ok",
  request: "tone-muted",
  approved: "tone-info",
  rfq: "tone-warn",
  pending: "tone-muted",
  in_progress: "tone-info",
  done: "tone-ok",
  blocked: "tone-bad",
  active: "tone-ok",
  leave: "tone-warn",
  terminated: "tone-bad",
  critical: "tone-bad",
  warning: "tone-warn",
  info: "tone-info",
};
