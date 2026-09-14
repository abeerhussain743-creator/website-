import { describe, expect, it } from "vitest";
import {
  autoMapColumns,
  detectDataset,
  parseCsv,
  validateProductRows,
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
