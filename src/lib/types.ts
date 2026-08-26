export type Role =
  | "owner"
  | "admin"
  | "sales_manager"
  | "salesperson"
  | "purchase_manager"
  | "store_manager"
  | "production_manager"
  | "qc_manager"
  | "accountant"
  | "hr_manager"
  | "worker";

export type InventoryCategory =
  | "raw_material"
  | "wip"
  | "finished_goods"
  | "scrap"
  | "packaging"
  | "component";

export type PipelineStage =
  | "lead"
  | "qualified"
  | "quotation"
  | "negotiation"
  | "sales_order"
  | "production"
  | "dispatch"
  | "invoice"
  | "payment";

export type ProductionStatus =
  | "draft"
  | "materials_check"
  | "ready"
  | "in_production"
  | "quality_check"
  | "completed"
  | "delayed";

export type PurchaseStatus =
  | "request"
  | "approved"
  | "rfq"
  | "ordered"
  | "received"
  | "inspected"
  | "invoiced"
  | "paid";

export type QualityStage =
  | "raw_material"
  | "in_process"
  | "final"
  | "dispatch";

export type MaintenanceType = "preventive" | "corrective";

export type PlanId = "starter" | "growth" | "professional" | "enterprise";

export interface Company {
  id: string;
  name: string;
  industry: string;
  plan: PlanId;
  plants: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  avatarInitials: string;
}

export interface Customer {
  id: string;
  company: string;
  contact: string;
  phone: string;
  email: string;
  industry: string;
  creditLimit: number;
  paymentTerms: string;
  outstanding: number;
  stage: PipelineStage;
  lifetimeValue: number;
}

export interface Supplier {
  id: string;
  company: string;
  contact: string;
  phone: string;
  email: string;
  paymentTerms: string;
  rating: number;
  leadTimeDays: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  quantity: number;
  reserved: number;
  minStock: number;
  reorderPoint: number;
  warehouse: string;
  bin: string;
  batch?: string;
  supplierId?: string;
  unitCost: number;
  sellPrice?: number;
}

export interface BomLine {
  productId: string;
  quantity: number;
}

export interface BillOfMaterials {
  id: string;
  productId: string;
  version: string;
  lines: BomLine[];
}

export interface QuotationLine {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface Quotation {
  id: string;
  number: string;
  customerId: string;
  date: string;
  validUntil: string;
  lines: QuotationLine[];
  taxRate: number;
  discount: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "converted";
}

export interface SalesOrder {
  id: string;
  number: string;
  customerId: string;
  quotationId?: string;
  date: string;
  dueDate: string;
  lines: QuotationLine[];
  status: "confirmed" | "in_production" | "ready" | "dispatched" | "invoiced" | "paid";
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  date: string;
  expectedDate: string;
  lines: { productId: string; quantity: number; unitCost: number }[];
  status: PurchaseStatus;
  total: number;
}

export interface ProductionOrder {
  id: string;
  number: string;
  productId: string;
  salesOrderId?: string;
  quantity: number;
  deadline: string;
  status: ProductionStatus;
  materialsReady: boolean;
  machineReady: boolean;
  laborReady: boolean;
  progress: number;
  machineId?: string;
}

export interface WorkOrder {
  id: string;
  productionOrderId: string;
  stage: string;
  department: string;
  status: "pending" | "in_progress" | "done" | "blocked";
  assignee?: string;
  sequence: number;
}

export interface Machine {
  id: string;
  name: string;
  location: string;
  status: "running" | "idle" | "maintenance" | "down";
  capacityPerHour: number;
  runtimeHours: number;
  efficiency: number;
  nextMaintenanceHours: number;
}

export interface MaintenanceRecord {
  id: string;
  machineId: string;
  type: MaintenanceType;
  problem: string;
  reportedBy: string;
  date: string;
  technician: string;
  partsCost: number;
  downtimeHours: number;
  resolution: string;
  status: "open" | "in_progress" | "closed";
}

export interface QualityCheck {
  id: string;
  reference: string;
  stage: QualityStage;
  batch: string;
  inspector: string;
  inspected: number;
  rejected: number;
  defect?: string;
  correctiveAction?: string;
  date: string;
  status: "pass" | "fail" | "conditional";
}

export interface Warehouse {
  id: string;
  name: string;
  zones: string[];
}

export interface Invoice {
  id: string;
  number: string;
  type: "receivable" | "payable";
  partyName: string;
  date: string;
  dueDate: string;
  amount: number;
  paid: number;
  status: "open" | "partial" | "overdue" | "paid";
}

export interface BankAccount {
  id: string;
  name: string;
  type: "bank" | "cash";
  balance: number;
}

export interface Employee {
  id: string;
  name: string;
  department: string;
  role: string;
  shift: "morning" | "evening" | "night";
  status: "active" | "leave" | "terminated";
  hourlyRate: number;
}

export interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  module: string;
  title: string;
  detail: string;
  time: string;
}

export interface AiInsight {
  id: string;
  question: string;
  answer: string;
  metrics: { label: string; value: string; trend?: "up" | "down" | "flat" }[];
}

export interface DashboardMetrics {
  revenue: number;
  salesOrders: number;
  productionOrders: number;
  pendingOrders: number;
  lowStockItems: number;
  purchaseOrders: number;
  receivables: number;
  payables: number;
  cashBalance: number;
}

export interface AppData {
  company: Company;
  user: User;
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  boms: BillOfMaterials[];
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  productionOrders: ProductionOrder[];
  workOrders: WorkOrder[];
  machines: Machine[];
  maintenance: MaintenanceRecord[];
  qualityChecks: QualityCheck[];
  warehouses: Warehouse[];
  invoices: Invoice[];
  bankAccounts: BankAccount[];
  employees: Employee[];
  alerts: Alert[];
  aiInsights: AiInsight[];
  metrics: DashboardMetrics;
  revenueTrend: { month: string; revenue: number; cogs: number; profit: number }[];
  productionTrend: { day: string; planned: number; actual: number }[];
}
