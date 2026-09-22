import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@maxtrone/db";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ctx = await requireSuperAdmin(req);
  if ("error" in ctx && ctx.error) return ctx.error;

  const tenants = await prisma.institution.findMany({
    include: {
      plan: true,
      _count: { select: { students: true, memberships: true } },
      usageMeters: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    tenants: tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      plan: t.plan.code,
      students: t._count.students,
      staff: t._count.memberships,
      usage: t.usageMeters,
      lastActivity: t.updatedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireSuperAdmin(req);
  if ("error" in ctx && ctx.error) return ctx.error;
  const { session } = ctx as Exclude<typeof ctx, { error: NextResponse }>;
  const body = await req.json();

  if (body.action === "override_entitlement") {
    await prisma.institutionEntitlementOverride.upsert({
      where: {
        institutionId_feature: {
          institutionId: body.institutionId,
          feature: body.feature,
        },
      },
      update: { enabled: body.enabled, limit: body.limit ?? null },
      create: {
        institutionId: body.institutionId,
        feature: body.feature,
        enabled: body.enabled,
        limit: body.limit ?? null,
      },
    });
    await writeAudit({
      institutionId: body.institutionId,
      actorId: session.user.id,
      action: "entitlement.override",
      entityType: "Institution",
      entityId: body.institutionId,
      diff: body,
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "impersonate_readonly") {
    await writeAudit({
      institutionId: body.institutionId,
      actorId: session.user.id,
      action: "impersonate.readonly",
      entityType: "Institution",
      entityId: body.institutionId,
    });
    return NextResponse.json({ ok: true, mode: "readonly" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
