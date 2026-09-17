import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@shopdata/db";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const existing = await prisma.fieldMapping.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.fieldMapping.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        organizationId: existing.organizationId,
        storeId: existing.storeId,
        action: "field_mapping.deleted",
        resourceType: "field_mapping",
        resourceId: id,
        metadata: { name: existing.name },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[field-mappings DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 },
    );
  }
}
