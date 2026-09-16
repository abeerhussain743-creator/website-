import { NextRequest, NextResponse } from "next/server";
import {
  autoMapColumns,
  buildImportPreviewSummary,
  detectDataset,
  parseSpreadsheet,
  validateProductRows,
} from "@shopdata/files";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      csvContent?: string;
      fileBase64?: string;
      filename?: string;
    };

    const filename = body.filename ?? "upload.csv";
    const isExcel =
      filename.toLowerCase().endsWith(".xlsx") ||
      filename.toLowerCase().endsWith(".xls");

    let tableSource: string | Buffer;
    if (isExcel) {
      if (!body.fileBase64) {
        return NextResponse.json(
          { error: "fileBase64 required for Excel uploads" },
          { status: 400 },
        );
      }
      tableSource = Buffer.from(body.fileBase64, "base64");
    } else if (body.csvContent) {
      if (body.csvContent.length > 25_000_000) {
        return NextResponse.json(
          { error: "File too large for inline analyze; use staged upload" },
          { status: 413 },
        );
      }
      tableSource = body.csvContent;
    } else {
      return NextResponse.json(
        { error: "csvContent or fileBase64 required" },
        { status: 400 },
      );
    }

    const table = parseSpreadsheet(tableSource, filename);
    const dataset = detectDataset(table.columns);
    if (dataset !== "PRODUCTS") {
      return NextResponse.json(
        { error: "Could not detect a product dataset from columns" },
        { status: 400 },
      );
    }

    const mappings = autoMapColumns(table.columns);
    const issues = validateProductRows(table.rows, mappings);
    const preview = buildImportPreviewSummary(table.rows, mappings, issues);

    // Keep a CSV representation for the start/worker pipeline.
    const csvContent =
      !isExcel && body.csvContent
        ? body.csvContent
        : [
            table.columns.join(","),
            ...table.rows.map((row) =>
              table.columns
                .map((col) => `"${String(row[col] ?? "").replaceAll('"', '""')}"`)
                .join(","),
            ),
          ].join("\n");

    return NextResponse.json({
      columns: table.columns,
      dataset,
      rowCount: table.rows.length,
      mappings,
      issues,
      preview,
      csvContent,
      filename,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analyze failed" },
      { status: 400 },
    );
  }
}
