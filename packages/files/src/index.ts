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

export type ProductSetInput = {
  handle: string;
  title: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  status?: "ACTIVE" | "DRAFT" | "ARCHIVED";
  seo?: { title?: string; description?: string };
  variants?: Array<{
    sku?: string;
    price?: string;
    compareAtPrice?: string;
    barcode?: string;
    inventoryQuantities?: Array<{
      name: string;
      quantity: number;
    }>;
  }>;
};

function mappedValue(
  row: Record<string, string>,
  mappings: FieldMappingEntry[],
  targetField: string,
): string | undefined {
  const mapping = mappings.find((m) => m.targetField === targetField);
  if (!mapping) return undefined;
  const value = (row[mapping.sourceColumn] ?? "").trim();
  return value || undefined;
}

/** Convert a CSV row + mappings into a Shopify productSet input. */
export function rowToProductSetInput(
  row: Record<string, string>,
  mappings: FieldMappingEntry[],
): ProductSetInput | null {
  const handle = mappedValue(row, mappings, "product.handle");
  const title = mappedValue(row, mappings, "product.title");
  if (!handle || !title) return null;

  const statusRaw = mappedValue(row, mappings, "product.status")?.toUpperCase();
  const status =
    statusRaw === "ACTIVE" || statusRaw === "DRAFT" || statusRaw === "ARCHIVED"
      ? statusRaw
      : undefined;

  const tagsRaw = mappedValue(row, mappings, "product.tags");
  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : undefined;

  const sku = mappedValue(row, mappings, "variant.sku");
  const price = mappedValue(row, mappings, "variant.price");
  const compareAtPrice = mappedValue(row, mappings, "variant.compareAtPrice");
  const barcode = mappedValue(row, mappings, "variant.barcode");
  const inventoryRaw = mappedValue(row, mappings, "variant.inventoryQuantity");
  const inventoryQuantity =
    inventoryRaw !== undefined && inventoryRaw !== "" && !Number.isNaN(Number(inventoryRaw))
      ? Number(inventoryRaw)
      : undefined;

  const hasVariant =
    sku || price || compareAtPrice || barcode || inventoryQuantity !== undefined;

  const seoTitle = mappedValue(row, mappings, "product.seoTitle");
  const seoDescription = mappedValue(row, mappings, "product.seoDescription");

  const input: ProductSetInput = {
    handle,
    title,
    descriptionHtml: mappedValue(row, mappings, "product.bodyHtml"),
    vendor: mappedValue(row, mappings, "product.vendor"),
    productType: mappedValue(row, mappings, "product.productType"),
    tags,
    status,
  };

  if (seoTitle || seoDescription) {
    input.seo = {
      title: seoTitle,
      description: seoDescription,
    };
  }

  if (hasVariant) {
    input.variants = [
      {
        sku,
        price,
        compareAtPrice,
        barcode,
        inventoryQuantities:
          inventoryQuantity === undefined
            ? undefined
            : [
                {
                  name: "available",
                  quantity: inventoryQuantity,
                },
              ],
      },
    ];
  }

  return input;
}

export function buildProductSetJsonl(
  rows: Record<string, string>[],
  mappings: FieldMappingEntry[],
  options?: { skipRows?: Set<number> },
): { jsonl: string; includedRowNumbers: number[]; skipped: number } {
  const lines: string[] = [];
  const includedRowNumbers: number[] = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (options?.skipRows?.has(rowNumber)) {
      skipped += 1;
      return;
    }
    const input = rowToProductSetInput(row, mappings);
    if (!input) {
      skipped += 1;
      return;
    }
    lines.push(JSON.stringify({ input }));
    includedRowNumbers.push(rowNumber);
  });

  return {
    jsonl: lines.join("\n") + (lines.length ? "\n" : ""),
    includedRowNumbers,
    skipped,
  };
}

export function buildErrorReportCsv(
  errors: Array<{
    rowNumber?: number | null;
    field?: string | null;
    value?: string | null;
    message: string;
    suggestedFix?: string | null;
  }>,
): string {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const header = ["Row", "Field", "Value", "Error", "Suggested Fix"];
  const lines = [
    header.join(","),
    ...errors.map((error) =>
      [
        String(error.rowNumber ?? ""),
        escape(error.field ?? ""),
        escape(error.value ?? ""),
        escape(error.message),
        escape(error.suggestedFix ?? ""),
      ].join(","),
    ),
  ];
  return lines.join("\n");
}

/** Flatten Shopify product bulk-export JSONL into CSV rows. */
export function productExportJsonlToCsv(jsonl: string): string {
  type Node = Record<string, unknown> & {
    id?: string;
    handle?: string;
    title?: string;
    __parentId?: string;
  };

  const products = new Map<string, Node>();
  const variants: Node[] = [];

  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    const node = JSON.parse(line) as Node;
    if (typeof node.id === "string" && node.id.includes("Product/") && !node.id.includes("ProductVariant")) {
      products.set(node.id, node);
    } else if (typeof node.id === "string" && node.id.includes("ProductVariant")) {
      variants.push(node);
    }
  }

  const header = [
    "Handle",
    "Title",
    "Vendor",
    "Product Type",
    "Tags",
    "Status",
    "SKU",
    "Price",
    "Compare At Price",
    "Barcode",
    "Inventory Quantity",
  ];
  const escape = (value: unknown) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;

  const rows: string[] = [header.join(",")];
  if (variants.length === 0) {
    for (const product of products.values()) {
      rows.push(
        [
          escape(product.handle),
          escape(product.title),
          escape(product.vendor),
          escape(product.productType),
          escape(Array.isArray(product.tags) ? product.tags.join(", ") : product.tags),
          escape(product.status),
          '""',
          '""',
          '""',
          '""',
          '""',
        ].join(","),
      );
    }
  } else {
    for (const variant of variants) {
      const parentId = String(variant.__parentId ?? "");
      const product = products.get(parentId) ?? {};
      rows.push(
        [
          escape(product.handle),
          escape(product.title),
          escape(product.vendor),
          escape(product.productType),
          escape(Array.isArray(product.tags) ? product.tags.join(", ") : product.tags),
          escape(product.status),
          escape(variant.sku),
          escape(variant.price),
          escape(variant.compareAtPrice),
          escape(variant.barcode),
          escape(variant.inventoryQuantity),
        ].join(","),
      );
    }
  }

  return rows.join("\n");
}
