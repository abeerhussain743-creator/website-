import { PrismaClient, InstitutionType, PlanCode, SystemRole } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import {
  DEFAULT_PERMISSIONS,
  terminologyForType,
} from "@maxtrone/core";

const prisma = new PrismaClient();

async function upsertPlan(
  code: PlanCode,
  name: string,
  entitlements: Array<{ feature: string; enabled: boolean; limit?: number }>,
) {
  const plan = await prisma.plan.upsert({
    where: { code },
    update: { name, isActive: true },
    create: { code, name, isActive: true },
  });

  for (const e of entitlements) {
    await prisma.entitlement.upsert({
      where: { planId_feature: { planId: plan.id, feature: e.feature } },
      update: { enabled: e.enabled, limit: e.limit ?? null },
      create: {
        planId: plan.id,
        feature: e.feature,
        enabled: e.enabled,
        limit: e.limit ?? null,
      },
    });
  }

  return plan;
}

async function main() {
  const starter = await upsertPlan(PlanCode.STARTER, "Starter", [
    { feature: "admissions", enabled: true },
    { feature: "fees", enabled: true },
    { feature: "attendance", enabled: true },
    { feature: "whatsapp_inbox", enabled: true },
    { feature: "briefing", enabled: true },
    { feature: "ai_admissions", enabled: false },
    { feature: "ai_tutor", enabled: false },
    { feature: "voice_calls", enabled: false },
    { feature: "students", enabled: true, limit: 300 },
    { feature: "branches", enabled: true, limit: 1 },
    { feature: "whatsapp_messages", enabled: true, limit: 2000 },
  ]);

  await upsertPlan(PlanCode.GROWTH, "Growth", [
    { feature: "admissions", enabled: true },
    { feature: "fees", enabled: true },
    { feature: "attendance", enabled: true },
    { feature: "whatsapp_inbox", enabled: true },
    { feature: "briefing", enabled: true },
    { feature: "ai_admissions", enabled: true },
    { feature: "ai_tutor", enabled: false },
    { feature: "voice_calls", enabled: false },
    { feature: "students", enabled: true, limit: 1500 },
    { feature: "branches", enabled: true, limit: 3 },
    { feature: "whatsapp_messages", enabled: true, limit: 15000 },
  ]);

  const premium = await upsertPlan(PlanCode.PREMIUM, "Premium", [
    { feature: "admissions", enabled: true },
    { feature: "fees", enabled: true },
    { feature: "attendance", enabled: true },
    { feature: "whatsapp_inbox", enabled: true },
    { feature: "briefing", enabled: true },
    { feature: "ai_admissions", enabled: true },
    { feature: "ai_tutor", enabled: true },
    { feature: "voice_calls", enabled: true },
    { feature: "students", enabled: true, limit: 5000 },
    { feature: "branches", enabled: true, limit: 10 },
    { feature: "whatsapp_messages", enabled: true, limit: 50000 },
    { feature: "ai_tutor_seats", enabled: true, limit: 500 },
    { feature: "voice_minutes", enabled: true, limit: 300 },
  ]);

  await upsertPlan(PlanCode.CUSTOM, "Custom", [
    { feature: "admissions", enabled: true },
    { feature: "fees", enabled: true },
    { feature: "attendance", enabled: true },
    { feature: "whatsapp_inbox", enabled: true },
    { feature: "briefing", enabled: true },
    { feature: "ai_admissions", enabled: true },
    { feature: "ai_tutor", enabled: true },
    { feature: "voice_calls", enabled: true },
  ]);

  const passwordHash = await hashPassword("password123");

  const owner = await prisma.user.upsert({
    where: { email: "owner@greenfield.edu.pk" },
    update: { name: "Ayesha Khan" },
    create: {
      name: "Ayesha Khan",
      email: "owner@greenfield.edu.pk",
      emailVerified: true,
      accounts: {
        create: {
          accountId: "owner@greenfield.edu.pk",
          providerId: "credential",
          password: passwordHash,
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "superadmin@maxtrone.local" },
    update: { isSuperAdmin: true },
    create: {
      name: "Maxtrone Super Admin",
      email: "superadmin@maxtrone.local",
      emailVerified: true,
      isSuperAdmin: true,
      accounts: {
        create: {
          accountId: "superadmin@maxtrone.local",
          providerId: "credential",
          password: passwordHash,
        },
      },
    },
  });

  const institution = await prisma.institution.upsert({
    where: { slug: "greenfield-school" },
    update: { name: "Greenfield School", status: "ACTIVE" },
    create: {
      name: "Greenfield School",
      slug: "greenfield-school",
      type: InstitutionType.SCHOOL,
      status: "ACTIVE",
      city: "Lahore",
      timezone: "Asia/Karachi",
      currency: "PKR",
      planId: premium.id,
      onboardingStep: "complete",
    },
  });

  const terms = terminologyForType(InstitutionType.SCHOOL);
  await prisma.terminologyMap.upsert({
    where: { institutionId: institution.id },
    update: terms,
    create: { institutionId: institution.id, ...terms },
  });

  const branch = await prisma.branch.upsert({
    where: {
      institutionId_name: { institutionId: institution.id, name: "Main Campus" },
    },
    update: { isPrimary: true, city: "Lahore" },
    create: {
      institutionId: institution.id,
      name: "Main Campus",
      city: "Lahore",
      isPrimary: true,
      address: "Gulberg III, Lahore",
    },
  });

  const ownerRole = await prisma.role.upsert({
    where: { institutionId_name: { institutionId: institution.id, name: "Owner" } },
    update: { permissions: DEFAULT_PERMISSIONS.OWNER },
    create: {
      institutionId: institution.id,
      name: "Owner",
      systemRole: SystemRole.OWNER,
      permissions: DEFAULT_PERMISSIONS.OWNER,
      isSystem: true,
    },
  });

  for (const [name, systemRole] of [
    ["Principal", SystemRole.PRINCIPAL],
    ["Admin", SystemRole.ADMIN],
    ["Accountant", SystemRole.ACCOUNTANT],
    ["Teacher", SystemRole.TEACHER],
  ] as const) {
    await prisma.role.upsert({
      where: { institutionId_name: { institutionId: institution.id, name } },
      update: { permissions: DEFAULT_PERMISSIONS[systemRole] },
      create: {
        institutionId: institution.id,
        name,
        systemRole,
        permissions: DEFAULT_PERMISSIONS[systemRole],
        isSystem: true,
      },
    });
  }

  await prisma.membership.upsert({
    where: {
      institutionId_userId: { institutionId: institution.id, userId: owner.id },
    },
    update: { roleId: ownerRole.id, isActive: true },
    create: {
      institutionId: institution.id,
      userId: owner.id,
      roleId: ownerRole.id,
      branchId: branch.id,
      isActive: true,
    },
  });

  const session = await prisma.academicSession.upsert({
    where: { id: "seed-session-2026" },
    update: { isCurrent: true },
    create: {
      id: "seed-session-2026",
      institutionId: institution.id,
      name: "2025-26",
      startsOn: new Date("2025-08-01"),
      endsOn: new Date("2026-06-30"),
      isCurrent: true,
    },
  });

  const class8 = await prisma.group.upsert({
    where: { institutionId_name: { institutionId: institution.id, name: "Class 8" } },
    update: {},
    create: {
      institutionId: institution.id,
      branchId: branch.id,
      name: "Class 8",
      sortOrder: 8,
    },
  });

  const sectionA = await prisma.subgroup.upsert({
    where: { groupId_name: { groupId: class8.id, name: "A" } },
    update: {},
    create: {
      institutionId: institution.id,
      groupId: class8.id,
      name: "A",
    },
  });

  const student = await prisma.student.upsert({
    where: {
      institutionId_registrationNo: {
        institutionId: institution.id,
        registrationNo: "GF-2025-001",
      },
    },
    update: { fullName: "Hassan Ali" },
    create: {
      institutionId: institution.id,
      branchId: branch.id,
      fullName: "Hassan Ali",
      registrationNo: "GF-2025-001",
      status: "ACTIVE",
      admittedOn: new Date("2025-08-15"),
    },
  });

  const guardian = await prisma.guardian.upsert({
    where: {
      institutionId_phone: { institutionId: institution.id, phone: "+923001234567" },
    },
    update: { fullName: "Imran Ali" },
    create: {
      institutionId: institution.id,
      fullName: "Imran Ali",
      phone: "+923001234567",
      relation: "Father",
      preferredLanguage: "ROMAN_UR",
      preferredChannel: "WHATSAPP_TEXT",
      whatsappOptIn: true,
      whatsappOptInAt: new Date(),
    },
  });

  await prisma.studentGuardian.upsert({
    where: {
      studentId_guardianId: { studentId: student.id, guardianId: guardian.id },
    },
    update: { isPrimary: true },
    create: {
      institutionId: institution.id,
      studentId: student.id,
      guardianId: guardian.id,
      isPrimary: true,
    },
  });

  const existingEnrollment = await prisma.enrollment.findFirst({
    where: { institutionId: institution.id, studentId: student.id },
  });
  if (!existingEnrollment) {
    await prisma.enrollment.create({
      data: {
        institutionId: institution.id,
        studentId: student.id,
        groupId: class8.id,
        subgroupId: sectionA.id,
        academicSessionId: session.id,
      },
    });
  }

  // Second institution for isolation tests / demos
  const rival = await prisma.institution.upsert({
    where: { slug: "bright-coaching" },
    update: {},
    create: {
      name: "Bright Coaching Academy",
      slug: "bright-coaching",
      type: InstitutionType.COACHING_ACADEMY,
      status: "ACTIVE",
      city: "Karachi",
      planId: starter.id,
    },
  });

  const rivalTerms = terminologyForType(InstitutionType.COACHING_ACADEMY);
  await prisma.terminologyMap.upsert({
    where: { institutionId: rival.id },
    update: rivalTerms,
    create: { institutionId: rival.id, ...rivalTerms },
  });

  await prisma.student.upsert({
    where: {
      institutionId_registrationNo: {
        institutionId: rival.id,
        registrationNo: "BC-100",
      },
    },
    update: {},
    create: {
      institutionId: rival.id,
      fullName: "Secret Rival Student",
      registrationNo: "BC-100",
      status: "ACTIVE",
    },
  });

  console.log("Seed complete.");
  console.log("  Owner: owner@greenfield.edu.pk / password123");
  console.log("  Super-admin: superadmin@maxtrone.local / password123");
  console.log(`  Institution: ${institution.name} (${institution.slug})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
