import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma, createTenantClient } from "@maxtrone/db";
import { auth } from "./auth";

export async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");
  return session;
}

export async function getActiveMembership(userId: string) {
  return prisma.membership.findFirst({
    where: { userId, isActive: true, deletedAt: null },
    include: {
      institution: {
        include: {
          terminology: true,
          plan: { include: { entitlements: true } },
          entitlementOverrides: true,
        },
      },
      role: true,
      branch: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function requireTenantContext() {
  const session = await requireSession();
  const membership = await getActiveMembership(session.user.id);
  if (!membership) redirect("/onboarding");
  const db = createTenantClient(prisma, membership.institutionId);
  return { session, membership, db, institution: membership.institution };
}
