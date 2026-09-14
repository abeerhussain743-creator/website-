import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@shopdata/db";
import { enqueueJob } from "@shopdata/jobs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      storeId?: string;
      format?: string;
      dataset?: string;
    };

    if (!body.storeId) {
      return NextResponse.json({ error: "storeId required" }, { status: 400 });
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
        type: "PRODUCT_EXPORT",
        dataset: "PRODUCTS",
        status: "QUEUED",
        config: {
          format: body.format ?? "CSV",
          dataset: body.dataset ?? "PRODUCTS",
        },
      },
    });

    await enqueueJob({
      jobId: job.id,
      organizationId: store.organizationId,
      storeId: store.id,
      type: "PRODUCT_EXPORT",
    });

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Export start failed (check Redis / Shopify credentials)",
      },
      { status: 500 },
    );
  }
}
