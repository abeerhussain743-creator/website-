import { NextRequest, NextResponse } from "next/server";
import {
  autoMapColumns,
  buildPreviewSummary,
  detectDataset,
  parseCsv,
  validateProductRows,
} from "@shopdata/files";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      csvContent?: string;
      filename?: string;
    };

    if (!body.csvContent) {
      return NextResponse.json({ error: "csvContent required" }, { status: 400 });
    }

    if (body.csvContent.length > 25_000_000) {
      return NextResponse.json(
        { error: "File too large for inline analyze; use staged upload" },
        { status: 413 },
      );
    }

    const table = parseCsv(body.csvContent);
    const dataset = detectDataset(table.columns);
    if (dataset !== "PRODUCTS") {
      return NextResponse.json(
        { error: "Could not detect a product dataset from columns" },
        { status: 400 },
      );
    }

    const mappings = autoMapColumns(table.columns);
    const issues = validateProductRows(table.rows, mappings);
    const preview = buildPreviewSummary(table.rows.length, issues);

    return NextResponse.json({
      columns: table.columns,
      dataset,
      rowCount: table.rows.length,
      mappings,
      issues,
      preview,
      csvContent: body.csvContent,
      filename: body.filename ?? "upload.csv",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analyze failed" },
      { status: 400 },
    );
  }
}
