import { NextRequest, NextResponse } from "next/server";
import { prisma, createTenantClient } from "@maxtrone/db";
import { assertPermission, type Permission } from "@maxtrone/core";
import { auth } from "@/lib/auth";
import { getActiveMembership } from "@/lib/tenant";

export async function requireApiTenant(
  req: NextRequest,
  permission?: Permission,
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const membership = await getActiveMembership(session.user.id);
  if (!membership) {
    return { error: NextResponse.json({ error: "No membership" }, { status: 403 }) };
  }
  if (permission) {
    try {
      assertPermission(membership.role.permissions, permission);
    } catch {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
  }
  const db = createTenantClient(prisma, membership.institutionId);
  return { session, membership, db, institution: membership.institution };
}

export async function requireSuperAdmin(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isSuperAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, user };
}
