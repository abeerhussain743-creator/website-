import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@shopdata/db";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (["COMPLETED", "FAILED", "CANCELLED", "PARTIALLY_COMPLETED"].includes(job.status)) {
    return NextResponse.json({ error: "Job already finished" }, { status: 400 });
  }

  await prisma.job.update({
    where: { id },
    data: { cancelRequested: true },
  });

  return NextResponse.json({ ok: true });
}
