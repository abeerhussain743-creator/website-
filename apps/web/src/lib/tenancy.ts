import { prisma, MembershipRole, OnboardingStep } from "@postpilot/db";
import { uniqueSlug } from "@postpilot/shared";
import { randomBytes } from "node:crypto";

export async function ensurePersonalOrg(userId: string, nameHint?: string) {
  const existingMembership = await prisma.membership.findFirst({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  if (existingMembership) {
    return prisma.organization.findUniqueOrThrow({
      where: { id: existingMembership.organizationId },
      include: {
        workspaces: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  const base = nameHint?.trim() || "My Organization";
  const slug = uniqueSlug(base, randomBytes(2).toString("hex"));

  return prisma.organization.create({
    data: {
      name: base,
      slug,
      memberships: {
        create: {
          userId,
          role: MembershipRole.OWNER,
        },
      },
      subscription: {
        create: {
          planCode: "STARTER",
          status: "TRIALING",
          creditBalance: 100,
          brandLimit: 1,
          platformLimit: 2,
        },
      },
      workspaces: {
        create: {
          name: "My Brand",
          slug: uniqueSlug("my-brand", randomBytes(2).toString("hex")),
          onboardingStep: OnboardingStep.BUSINESS,
          onboardingData: {},
        },
      },
    },
    include: { workspaces: true },
  });
}

export async function getPrimaryWorkspaceForUser(userId: string) {
  const org = await ensurePersonalOrg(userId);
  const workspace = org.workspaces[0];
  if (!workspace) {
    throw new Error("Organization has no workspace");
  }
  return workspace;
}
