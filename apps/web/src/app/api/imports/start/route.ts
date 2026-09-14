import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma, prisma } from "@shopdata/db";
import { enqueueJob } from "@shopdata/jobs";
import { buildStorageKey, putObject } from "@shopdata/storage";
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

    const filename = body.filename ?? "upload.csv";
    const storageKey = buildStorageKey({
      organizationId: store.organizationId,
      kind: "upload",
      filename,
    });
    const stored = await putObject({
      key: storageKey,
      body: body.csvContent,
      contentType: "text/csv",
    });
    const inputFile = await prisma.fileObject.create({
      data: {
        organizationId: store.organizationId,
        storeId: store.id,
        kind: "UPLOAD",
        filename,
        contentType: "text/csv",
        sizeBytes: BigInt(stored.sizeBytes),
        storageKey: stored.key,
        checksum: createHash("sha256")
          .update(body.csvContent)
          .digest("hex"),
      },
    });

    const job = await prisma.job.create({
      data: {
        organizationId: store.organizationId,
        storeId: store.id,
        type: "PRODUCT_IMPORT",
        dataset: "PRODUCTS",
        status: "QUEUED",
        inputFileId: inputFile.id,
        mapping: body.mappings as unknown as Prisma.InputJsonValue,
        config: {
          // Keep inline content for small jobs / retry; worker prefers inputFile.
          csvContent: body.csvContent,
          filename,
          mappings: body.mappings,
          storageKey: stored.key,
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
    console.error("[imports/start]", error);
    const message =
      error instanceof Error
        ? error.message || error.name || "Start failed"
        : typeof error === "string"
          ? error
          : "Start failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
