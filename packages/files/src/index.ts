import { parse } from "csv-parse/sync";
import {
  PRODUCT_SHOPIFY_FIELDS,
  type FieldMappingEntry,
  type PreviewSummary,
  type ValidationIssue,
} from "@shopdata/shared";

export interface ParsedTable {
  columns: string[];
  rows: Record<string, string>[];
}

const COLUMN_ALIASES: Record<string, string> = {
  handle: "product.handle",
  title: "product.title",
  "product title": "product.title",
  "product name": "product.title",
  "body html": "product.bodyHtml",
  "body (html)": "product.bodyHtml",
  description: "product.bodyHtml",
  vendor: "product.vendor",
  "product type": "product.productType",
  type: "product.productType",
  tags: "product.tags",
  status: "product.status",
  sku: "variant.sku",
  "variant sku": "variant.sku",
  price: "variant.price",
  "variant price": "variant.price",
  "compare at price": "variant.compareAtPrice",
  "compare-at price": "variant.compareAtPrice",
  barcode: "variant.barcode",
  inventory: "variant.inventoryQuantity",
  "inventory quantity": "variant.inventoryQuantity",
  weight: "variant.weight",
  "seo title": "product.seoTitle",
  "seo description": "product.seoDescription",
};

export function parseCsv(content: string | Buffer): ParsedTable {
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const columns = records.length > 0 ? Object.keys(records[0]!) : [];
  return { columns, rows: records };
}

export function autoMapColumns(columns: string[]): FieldMappingEntry[] {
  return columns.map((sourceColumn) => {
    const normalized = sourceColumn.trim().toLowerCase();
    const exact = PRODUCT_SHOPIFY_FIELDS.find(
      (f) => f.key === normalized || f.label.toLowerCase() === normalized,
    );
    const aliased = COLUMN_ALIASES[normalized];
    return {
      sourceColumn,
      targetField: exact?.key ?? aliased ?? null,
    };
  });
}

export function validateProductRows(
  rows: Record<string, string>[],
  mappings: FieldMappingEntry[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const mapped = new Map(
    mappings
      .filter((m) => m.targetField)
      .map((m) => [m.targetField!, m.sourceColumn]),
  );

  const handleCol = mapped.get("product.handle");
  const titleCol = mapped.get("product.title");
  const priceCol = mapped.get("variant.price");
  const skuCol = mapped.get("variant.sku");

  if (!handleCol) {
    issues.push({
      row: 0,
      field: "product.handle",
      message: "Handle column is required",
      suggestedFix: "Map a column to Handle",
      severity: "error",
    });
  }
  if (!titleCol) {
    issues.push({
      row: 0,
      field: "product.title",
      message: "Title column is required",
      suggestedFix: "Map a column to Title",
      severity: "error",
    });
  }

  const seenHandles = new Map<string, number>();
  const seenSkus = new Map<string, number>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    if (handleCol) {
      const handle = (row[handleCol] ?? "").trim();
      if (!handle) {
        issues.push({
          row: rowNumber,
          field: "product.handle",
          value: handle,
          message: "Handle is required",
          suggestedFix: "Provide a unique product handle",
          severity: "error",
        });
      } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(handle)) {
        issues.push({
          row: rowNumber,
          field: "product.handle",
          value: handle,
          message: "Handle contains invalid characters",
          suggestedFix: "Use letters, numbers, and hyphens only",
          severity: "error",
        });
      } else if (seenHandles.has(handle)) {
        issues.push({
          row: rowNumber,
          field: "product.handle",
          value: handle,
          message: `Duplicate handle (also on row ${seenHandles.get(handle)})`,
          severity: "warning",
        });
      } else {
        seenHandles.set(handle, rowNumber);
      }
    }

    if (titleCol) {
      const title = (row[titleCol] ?? "").trim();
      if (!title) {
        issues.push({
          row: rowNumber,
          field: "product.title",
          value: title,
          message: "Title is required",
          severity: "error",
        });
      }
    }

    if (priceCol) {
      const price = (row[priceCol] ?? "").trim();
      if (price && Number.isNaN(Number(price))) {
        issues.push({
          row: rowNumber,
          field: "variant.price",
          value: price,
          message: "Price must be a valid number",
          suggestedFix: "Use a numeric value such as 19.99",
          severity: "error",
        });
      }
    }

    if (skuCol) {
      const sku = (row[skuCol] ?? "").trim();
      if (sku) {
        if (seenSkus.has(sku)) {
          issues.push({
            row: rowNumber,
            field: "variant.sku",
            value: sku,
            message: `Duplicate SKU (also on row ${seenSkus.get(sku)})`,
            severity: "warning",
          });
        } else {
          seenSkus.set(sku, rowNumber);
        }
      }
    }
  });

  return issues;
}

export function buildPreviewSummary(
  totalRows: number,
  issues: ValidationIssue[],
  assumedCreates?: number,
): PreviewSummary {
  const errors = issues.filter((i) => i.severity === "error" && i.row > 0).length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const creates = assumedCreates ?? Math.max(0, totalRows - errors);

  return {
    dataset: "PRODUCTS",
    totalRows,
    creates,
    updates: 0,
    unchanged: 0,
    errors,
    warnings,
  };
}

export function detectDataset(columns: string[]): "PRODUCTS" | "UNKNOWN" {
  const normalized = columns.map((c) => c.trim().toLowerCase());
  const productSignals = ["handle", "title", "sku", "price", "vendor"];
  const hits = productSignals.filter((s) =>
    normalized.some((c) => c === s || c.includes(s)),
  ).length;
  return hits >= 2 ? "PRODUCTS" : "UNKNOWN";
}
