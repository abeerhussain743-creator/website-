import { NextRequest, NextResponse } from "next/server";
import { Dataset, Prisma, prisma } from "@shopdata/db";
import type { FieldMappingEntry } from "@shopdata/shared";

export async function GET(req: NextRequest) {
  try {
    const storeId = req.nextUrl.searchParams.get("storeId");
    const datasetParam = req.nextUrl.searchParams.get("dataset") ?? "PRODUCTS";
    const dataset =
      datasetParam in Dataset
        ? (datasetParam as Dataset)
        : Dataset.PRODUCTS;

    const where: Prisma.FieldMappingWhereInput = { dataset };

    if (storeId) {
      const store = await prisma.store.findUnique({ where: { id: storeId } });
      if (!store) {
        return NextResponse.json({ error: "Store not found" }, { status: 404 });
      }
      where.organizationId = store.organizationId;
      where.OR = [{ storeId: store.id }, { storeId: null }];
    }

    const mappings = await prisma.fieldMapping.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      mappings: mappings.map((m) => ({
        id: m.id,
        name: m.name,
        dataset: m.dataset,
        storeId: m.storeId,
        mappings: m.mappings,
        updatedAt: m.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[field-mappings GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "List failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      storeId?: string;
      name?: string;
      dataset?: string;
      mappings?: FieldMappingEntry[];
      columns?: string[];
    };

    if (!body.storeId || !body.name?.trim() || !body.mappings?.length) {
      return NextResponse.json(
        { error: "storeId, name, and mappings are required" },
        { status: 400 },
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: body.storeId },
    });
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const dataset =
      body.dataset && body.dataset in Dataset
        ? (body.dataset as Dataset)
        : Dataset.PRODUCTS;

    const fieldMapping = await prisma.fieldMapping.create({
      data: {
        organizationId: store.organizationId,
        storeId: store.id,
        name: body.name.trim(),
        dataset,
        mappings: body.mappings as unknown as Prisma.InputJsonValue,
      },
    });

    // Also persist a template snapshot of source columns when provided.
    if (body.columns?.length) {
      await prisma.template.create({
        data: {
          organizationId: store.organizationId,
          storeId: store.id,
          name: body.name.trim(),
          dataset,
          columns: body.columns as unknown as Prisma.InputJsonValue,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: store.organizationId,
        storeId: store.id,
        action: "field_mapping.created",
        resourceType: "field_mapping",
        resourceId: fieldMapping.id,
        metadata: { name: fieldMapping.name, dataset },
      },
    });

    return NextResponse.json({
      id: fieldMapping.id,
      name: fieldMapping.name,
    });
  } catch (error) {
    console.error("[field-mappings POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 500 },
    );
  }
}
