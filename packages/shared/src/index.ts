export const APP_NAME = "ShopData";

export const JOB_STATUSES = [
  "QUEUED",
  "VALIDATING",
  "PROCESSING",
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_TYPES = [
  "PRODUCT_IMPORT",
  "PRODUCT_EXPORT",
  "PRODUCT_BULK_UPDATE",
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export const DATASETS = ["PRODUCTS"] as const;
export type Dataset = (typeof DATASETS)[number];

export const MEMBERSHIP_ROLES = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "OPERATOR",
  "VIEWER",
] as const;

export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const PLAN_CODES = [
  "FREE",
  "STARTER",
  "GROWTH",
  "PRO",
  "ENTERPRISE",
] as const;

export type PlanCode = (typeof PLAN_CODES)[number];

/** Product field catalog for mapping UI (MVP). */
export const PRODUCT_SHOPIFY_FIELDS = [
  { key: "product.handle", label: "Handle", required: true },
  { key: "product.title", label: "Title", required: true },
  { key: "product.bodyHtml", label: "Body HTML", required: false },
  { key: "product.vendor", label: "Vendor", required: false },
  { key: "product.productType", label: "Product Type", required: false },
  { key: "product.tags", label: "Tags", required: false },
  { key: "product.status", label: "Status", required: false },
  { key: "variant.sku", label: "SKU", required: false },
  { key: "variant.price", label: "Price", required: false },
  { key: "variant.compareAtPrice", label: "Compare At Price", required: false },
  { key: "variant.barcode", label: "Barcode", required: false },
  { key: "variant.inventoryQuantity", label: "Inventory Quantity", required: false },
  { key: "variant.weight", label: "Weight", required: false },
  { key: "product.seoTitle", label: "SEO Title", required: false },
  { key: "product.seoDescription", label: "SEO Description", required: false },
] as const;

export type ProductShopifyFieldKey =
  (typeof PRODUCT_SHOPIFY_FIELDS)[number]["key"];

export interface FieldMappingEntry {
  sourceColumn: string;
  targetField: ProductShopifyFieldKey | string | null;
}

export interface ValidationIssue {
  row: number;
  field?: string;
  value?: string;
  message: string;
  suggestedFix?: string;
  severity: "error" | "warning";
}

export interface PreviewSummary {
  dataset: Dataset;
  totalRows: number;
  creates: number;
  updates: number;
  unchanged: number;
  errors: number;
  warnings: number;
}

export interface BulkUpdateOperation {
  field: "price" | "compareAtPrice" | "inventoryQuantity" | "status" | "tags";
  mode: "set" | "percent" | "add" | "subtract";
  value: string;
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
