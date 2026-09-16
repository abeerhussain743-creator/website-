import { describe, expect, it } from "vitest";
import {
  autoMapColumns,
  detectDataset,
  parseCsv,
  validateProductRows,
  buildProductSetJsonl,
  applyBulkUpdateToProducts,
  demoProductsForDryRun,
  csvOrTableToXlsx,
  parseSpreadsheet,
  buildImportPreviewSummary,
} from "./index.js";

const sample = `Handle,Title,Vendor,SKU,Price
blue-shirt,Blue Shirt,Acme,SKU-1,19.99
bad,,Acme,SKU-2,abc
blue-shirt,Dup,Acme,SKU-1,10
`;

describe("parseCsv", () => {
  it("parses headers and rows", () => {
    const table = parseCsv(sample);
    expect(table.columns).toContain("Handle");
    expect(table.rows).toHaveLength(3);
  });
});

describe("autoMapColumns", () => {
  it("maps common product headers", () => {
    const mappings = autoMapColumns(["Handle", "Title", "Price", "Weird"]);
    expect(mappings.find((m) => m.sourceColumn === "Handle")?.targetField).toBe(
      "product.handle",
    );
    expect(
      mappings.find((m) => m.sourceColumn === "Weird")?.targetField,
    ).toBeNull();
  });
});

describe("validateProductRows", () => {
  it("flags missing title and bad price", () => {
    const table = parseCsv(sample);
    const mappings = autoMapColumns(table.columns);
    const issues = validateProductRows(table.rows, mappings);
    expect(issues.some((i) => i.field === "product.title" && i.row === 3)).toBe(
      true,
    );
    expect(issues.some((i) => i.field === "variant.price")).toBe(true);
  });
});

describe("detectDataset", () => {
  it("detects products", () => {
    expect(detectDataset(["Handle", "Title", "Price"])).toBe("PRODUCTS");
  });
});

describe("buildProductSetJsonl", () => {
  it("builds productSet JSONL lines", () => {
    const table = parseCsv(sample);
    const mappings = autoMapColumns(table.columns);
    const { jsonl, includedRowNumbers } = buildProductSetJsonl(
      table.rows,
      mappings,
      {
        skipRows: new Set([3]),
      },
    );
    expect(includedRowNumbers).toContain(2);
    expect(jsonl).toContain('"handle":"blue-shirt"');
    expect(jsonl.split("\n").filter(Boolean)).toHaveLength(
      includedRowNumbers.length,
    );
  });
});

describe("applyBulkUpdateToProducts", () => {
  it("applies percent price increase", () => {
    const { products, changed } = applyBulkUpdateToProducts(
      demoProductsForDryRun(),
      { field: "price", mode: "percent", value: "10" },
    );
    expect(changed).toBeGreaterThan(0);
    expect(products[0]?.variants[0]?.price).toBe("21.99");
  });
});

describe("xlsx roundtrip", () => {
  it("writes and reads xlsx", () => {
    const table = parseCsv(sample);
    const bytes = csvOrTableToXlsx(table);
    const parsed = parseSpreadsheet(bytes, "products.xlsx");
    expect(parsed.columns).toContain("Handle");
    expect(parsed.rows.length).toBe(3);
  });
});

describe("buildImportPreviewSummary", () => {
  it("counts duplicate handles as updates", () => {
    const table = parseCsv(sample);
    const mappings = autoMapColumns(table.columns);
    const issues = validateProductRows(table.rows, mappings);
    const preview = buildImportPreviewSummary(table.rows, mappings, issues);
    expect(preview.updates).toBeGreaterThanOrEqual(1);
  });
});
