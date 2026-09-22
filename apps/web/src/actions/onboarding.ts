"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  DEFAULT_PERMISSIONS,
  terminologyForType,
  textOnlyLadder,
  type InstitutionType,
} from "@maxtrone/core";
import { prisma } from "@maxtrone/db";
import { requireSession } from "@/lib/tenant";
import { writeAudit } from "@/lib/audit";

const DEFAULT_STAGES = [
  { name: "New", slug: "new", sortOrder: 0 },
  { name: "Contacted", slug: "contacted", sortOrder: 1 },
  { name: "Visit / Demo booked", slug: "visit_booked", sortOrder: 2 },
  { name: "Visited", slug: "visited", sortOrder: 3 },
  { name: "Test / Assessment", slug: "assessment", sortOrder: 4 },
  { name: "Admitted", slug: "admitted", sortOrder: 5, isWon: true },
  { name: "Lost", slug: "lost", sortOrder: 6, isLost: true },
];

export async function createInstitutionOnboarding(formData: FormData) {
  const session = await requireSession();
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "SCHOOL") as InstitutionType;
  const city = String(formData.get("city") || "").trim();
  const branchName = String(formData.get("branchName") || "Main Campus").trim();
  if (!name) throw new Error("Institution name required");

  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Date.now().toString(36);

  const plan = await prisma.plan.findUnique({ where: { code: "GROWTH" } });
  if (!plan) throw new Error("Plans not seeded");

  const institution = await prisma.institution.create({
    data: {
      name,
      slug,
      type,
      city: city || null,
      status: "ONBOARDING",
      planId: plan.id,
      onboardingStep: "groups",
      timezone: "Asia/Karachi",
      currency: "PKR",
    },
  });

  const terms = terminologyForType(type);
  await prisma.terminologyMap.create({
    data: { institutionId: institution.id, ...terms },
  });

  const branch = await prisma.branch.create({
    data: {
      institutionId: institution.id,
      name: branchName,
      city: city || null,
      isPrimary: true,
    },
  });

  const ownerRole = await prisma.role.create({
    data: {
      institutionId: institution.id,
      name: "Owner",
      systemRole: "OWNER",
      permissions: DEFAULT_PERMISSIONS.OWNER,
      isSystem: true,
    },
  });

  for (const [roleName, systemRole] of [
    ["Principal", "PRINCIPAL"],
    ["Admin", "ADMIN"],
    ["Accountant", "ACCOUNTANT"],
    ["Teacher", "TEACHER"],
  ] as const) {
    await prisma.role.create({
      data: {
        institutionId: institution.id,
        name: roleName,
        systemRole,
        permissions: DEFAULT_PERMISSIONS[systemRole],
        isSystem: true,
      },
    });
  }

  await prisma.membership.create({
    data: {
      institutionId: institution.id,
      userId: session.user.id,
      roleId: ownerRole.id,
      branchId: branch.id,
    },
  });

  for (const stage of DEFAULT_STAGES) {
    await prisma.leadStage.create({
      data: {
        institutionId: institution.id,
        name: stage.name,
        slug: stage.slug,
        sortOrder: stage.sortOrder,
        isWon: stage.isWon ?? false,
        isLost: stage.isLost ?? false,
      },
    });
  }

  await prisma.leadSource.createMany({
    data: [
      { institutionId: institution.id, name: "WhatsApp", code: "whatsapp" },
      { institutionId: institution.id, name: "Walk-in", code: "walkin" },
      { institutionId: institution.id, name: "Website", code: "website" },
      { institutionId: institution.id, name: "Referral", code: "referral" },
    ],
  });

  const ladder = await prisma.recoveryLadder.create({
    data: {
      institutionId: institution.id,
      name: "Default",
    },
  });

  const steps = textOnlyLadder();
  await prisma.recoveryStep.createMany({
    data: steps.map((s, i) => ({
      institutionId: institution.id,
      ladderId: ladder.id,
      dayOffset: s.dayOffset,
      channel: s.channel,
      templateBody: s.templateBody,
      sortOrder: i,
    })),
  });

  await prisma.whatsAppConnection.create({
    data: {
      institutionId: institution.id,
      mode: "SANDBOX",
      displayNumber: "+923000000000",
      connectedAt: new Date(),
    },
  });

  await prisma.academicSession.create({
    data: {
      institutionId: institution.id,
      name: "2025-26",
      startsOn: new Date("2025-08-01"),
      endsOn: new Date("2026-06-30"),
      isCurrent: true,
    },
  });

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "create",
    entityType: "Institution",
    entityId: institution.id,
  });

  redirect("/onboarding?step=groups");
}

export async function saveOnboardingGroups(formData: FormData) {
  const session = await requireSession();
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, isActive: true },
    include: { institution: true },
  });
  if (!membership) throw new Error("No institution");

  const raw = String(formData.get("groups") || "");
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const branch = await prisma.branch.findFirst({
    where: { institutionId: membership.institutionId, isPrimary: true },
  });

  for (const [i, line] of lines.entries()) {
    const [groupName, sections] = line.split(":").map((s) => s.trim());
    if (!groupName) continue;
    const group = await prisma.group.upsert({
      where: {
        institutionId_name: {
          institutionId: membership.institutionId,
          name: groupName,
        },
      },
      update: { sortOrder: i },
      create: {
        institutionId: membership.institutionId,
        branchId: branch?.id,
        name: groupName,
        sortOrder: i,
      },
    });
    const sectionNames = (sections || "A")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const sec of sectionNames) {
      await prisma.subgroup.upsert({
        where: { groupId_name: { groupId: group.id, name: sec } },
        update: {},
        create: {
          institutionId: membership.institutionId,
          groupId: group.id,
          name: sec,
        },
      });
    }
  }

  await prisma.institution.update({
    where: { id: membership.institutionId },
    data: { onboardingStep: "import" },
  });
  revalidatePath("/onboarding");
  redirect("/onboarding?step=import");
}

export async function completeOnboardingStep(step: string, next: string) {
  void step;
  const session = await requireSession();
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, isActive: true },
  });
  if (!membership) throw new Error("No institution");
  const data: { onboardingStep: string; status?: "ACTIVE" } = {
    onboardingStep: next,
  };
  if (next === "complete") {
    data.status = "ACTIVE";
  }
  await prisma.institution.update({
    where: { id: membership.institutionId },
    data,
  });
  revalidatePath("/dashboard");
  if (next === "complete") redirect("/dashboard");
  redirect(`/onboarding?step=${next}`);
}
