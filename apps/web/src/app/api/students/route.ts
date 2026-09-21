import { NextRequest, NextResponse } from "next/server";
import { prisma, createTenantClient } from "@maxtrone/db";
import { auth } from "@/lib/auth";
import { getActiveMembership } from "@/lib/tenant";
import { assertPermission, type Permission } from "@maxtrone/core";

/**
 * Example tenant-scoped API: list students for the caller's institution only.
 * Used by isolation tests to prove cross-tenant reads are impossible.
 */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getActiveMembership(session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "No institution membership" }, { status: 403 });
  }

  try {
    assertPermission(membership.role.permissions, "students.read" as Permission);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = createTenantClient(prisma, membership.institutionId);
  const students = await db.student.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      fullName: true,
      registrationNo: true,
      institutionId: true,
    },
    take: 100,
  });

  return NextResponse.json({
    institutionId: membership.institutionId,
    students,
  });
}
