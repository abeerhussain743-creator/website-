import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@shopdata/db";
import { enqueueJob } from "@shopdata/jobs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      storeId?: string;
      operation?: {
        field: string;
        mode: string;
        value: string;
      };
    };

    if (!body.storeId || !body.operation) {
      return NextResponse.json(
        { error: "storeId and operation required" },
        { status: 400 },
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: body.storeId },
      include: { connection: true },
    });

    if (!store?.connection || !store.isActive) {
      return NextResponse.json({ error: "Store is not connected" }, { status: 400 });
    }

    const job = await prisma.job.create({
      data: {
        organizationId: store.organizationId,
        storeId: store.id,
        type: "PRODUCT_BULK_UPDATE",
        dataset: "PRODUCTS",
        status: "QUEUED",
        config: { operation: body.operation },
      },
    });

    await enqueueJob({
      jobId: job.id,
      organizationId: store.organizationId,
      storeId: store.id,
      type: "PRODUCT_BULK_UPDATE",
    });

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bulk update failed" },
      { status: 500 },
    );
  }
}
