import { NextRequest, NextResponse } from "next/server";
import { Prisma, prisma } from "@shopdata/db";
import { enqueueJob } from "@shopdata/jobs";
import type { FieldMappingEntry } from "@shopdata/shared";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      storeId?: string;
      csvContent?: string;
      mappings?: FieldMappingEntry[];
      filename?: string;
    };

    if (!body.storeId || !body.csvContent || !body.mappings) {
      return NextResponse.json(
        { error: "storeId, csvContent, and mappings are required" },
        { status: 400 },
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: body.storeId },
      include: { connection: true },
    });

    if (!store?.connection || !store.isActive) {
      return NextResponse.json(
        { error: "Store is not connected" },
        { status: 400 },
      );
    }

    const job = await prisma.job.create({
      data: {
        organizationId: store.organizationId,
        storeId: store.id,
        type: "PRODUCT_IMPORT",
        dataset: "PRODUCTS",
        status: "QUEUED",
        mapping: body.mappings as unknown as Prisma.InputJsonValue,
        config: {
          csvContent: body.csvContent,
          filename: body.filename ?? "upload.csv",
          mappings: body.mappings,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: store.organizationId,
        storeId: store.id,
        action: "job.created",
        resourceType: "job",
        resourceId: job.id,
        metadata: { type: job.type },
      },
    });

    try {
      await enqueueJob({
        jobId: job.id,
        organizationId: store.organizationId,
        storeId: store.id,
        type: "PRODUCT_IMPORT",
      });
    } catch (queueError) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          logs: {
            error:
              queueError instanceof Error
                ? queueError.message
                : "Failed to enqueue job (is Redis running?)",
          },
        },
      });
      return NextResponse.json(
        {
          error:
            "Job created but queue enqueue failed. Ensure Redis is running and worker is up.",
          jobId: job.id,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Start failed" },
      { status: 500 },
    );
  }
}
