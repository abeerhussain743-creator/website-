import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@shopdata/db";
import { getObject } from "@shopdata/storage";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { outputFile: true },
  });

  if (!job?.outputFile?.storageKey) {
    return NextResponse.json(
      { error: "No export file available for this job" },
      { status: 404 },
    );
  }

  const bytes = await getObject(job.outputFile.storageKey);
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": job.outputFile.contentType || "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${job.outputFile.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
