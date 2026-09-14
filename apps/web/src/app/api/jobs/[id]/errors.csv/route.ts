import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@shopdata/db";
import { getObject } from "@shopdata/storage";
import { buildErrorReportCsv } from "@shopdata/files";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      errorFile: true,
      errors: { orderBy: { rowNumber: "asc" }, take: 10_000 },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  let csv: string;
  let filename = `shopdata-errors-${id}.csv`;

  if (job.errorFile?.storageKey) {
    csv = (await getObject(job.errorFile.storageKey)).toString("utf8");
    filename = job.errorFile.filename || filename;
  } else if (job.errors.length) {
    csv = buildErrorReportCsv(
      job.errors.map((e) => ({
        rowNumber: e.rowNumber,
        field: e.field,
        value: e.value,
        message: e.message,
        suggestedFix: e.suggestedFix,
      })),
    );
  } else {
    return NextResponse.json(
      { error: "No error report available for this job" },
      { status: 404 },
    );
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
