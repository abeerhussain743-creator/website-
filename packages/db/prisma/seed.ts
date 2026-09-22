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
    },
  });

  // Better Auth credential accounts must use accountId === user.id
  await prisma.account.upsert({
    where: { id: `cred-${owner.id}` },
    update: { password: passwordHash, accountId: owner.id },
    create: {
      id: `cred-${owner.id}`,
      accountId: owner.id,
      providerId: "credential",
      userId: owner.id,
      password: passwordHash,
    },
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@maxtrone.local" },
    update: { isSuperAdmin: true },
    create: {
      name: "Maxtrone Super Admin",
      email: "superadmin@maxtrone.local",
      emailVerified: true,
      isSuperAdmin: true,
    },
  });

  await prisma.account.upsert({
    where: { id: `cred-${superAdmin.id}` },
    update: { password: passwordHash, accountId: superAdmin.id },
    create: {
      id: `cred-${superAdmin.id}`,
      accountId: superAdmin.id,
      providerId: "credential",
      userId: superAdmin.id,
      password: passwordHash,
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

  // Phase 1 demo data
  const stageDefs = [
    { name: "New", slug: "new", sortOrder: 0 },
    { name: "Contacted", slug: "contacted", sortOrder: 1 },
    { name: "Visit / Demo booked", slug: "visit_booked", sortOrder: 2 },
    { name: "Visited", slug: "visited", sortOrder: 3 },
    { name: "Test / Assessment", slug: "assessment", sortOrder: 4 },
    { name: "Admitted", slug: "admitted", sortOrder: 5, isWon: true },
    { name: "Lost", slug: "lost", sortOrder: 6, isLost: true },
  ];
  for (const s of stageDefs) {
    await prisma.leadStage.upsert({
      where: {
        institutionId_slug: { institutionId: institution.id, slug: s.slug },
      },
      update: { name: s.name, sortOrder: s.sortOrder },
      create: {
        institutionId: institution.id,
        name: s.name,
        slug: s.slug,
        sortOrder: s.sortOrder,
        isWon: s.isWon ?? false,
        isLost: s.isLost ?? false,
      },
    });
  }

  for (const src of [
    { name: "WhatsApp", code: "whatsapp" },
    { name: "Walk-in", code: "walkin" },
    { name: "Website", code: "website" },
    { name: "Referral", code: "referral" },
  ]) {
    await prisma.leadSource.upsert({
      where: {
        institutionId_code: { institutionId: institution.id, code: src.code },
      },
      update: { name: src.name },
      create: { institutionId: institution.id, ...src },
    });
  }

  const newStage = await prisma.leadStage.findFirst({
    where: { institutionId: institution.id, slug: "new" },
  });
  const walkin = await prisma.leadSource.findFirst({
    where: { institutionId: institution.id, code: "walkin" },
  });
  if (newStage) {
    await prisma.lead.create({
      data: {
        institutionId: institution.id,
        stageId: newStage.id,
        sourceId: walkin?.id,
        parentName: "Sana Malik",
        phone: "+923009998887",
        childName: "Zain Malik",
        classSought: "Class 8",
        firstMessage: "Class 8 ki fee kitni hai?",
        status: "OPEN",
      },
    }).catch(() => null);
  }

  const { DEMO_KNOWLEDGE } = await import("@maxtrone/core");
  for (const kb of DEMO_KNOWLEDGE) {
    const existingKb = await prisma.knowledgeBaseEntry.findFirst({
      where: { institutionId: institution.id, title: kb.title },
    });
    if (!existingKb) {
      await prisma.knowledgeBaseEntry.create({
        data: {
          institutionId: institution.id,
          category: kb.category,
          title: kb.title,
          body: kb.body,
        },
      });
    }
  }

  const tuitionHead = await prisma.feeHead.upsert({
    where: {
      institutionId_name: { institutionId: institution.id, name: "Tuition" },
    },
    update: {},
    create: {
      institutionId: institution.id,
      name: "Tuition",
      kind: "TUITION",
    },
  });

  const existingStructure = await prisma.feeStructure.findFirst({
    where: { institutionId: institution.id, name: "Class 8 Tuition" },
  });
  if (!existingStructure) {
    await prisma.feeStructure.create({
      data: {
        institutionId: institution.id,
        feeHeadId: tuitionHead.id,
        groupId: class8.id,
        name: "Class 8 Tuition",
        amountPaisa: 1_500_000,
        frequency: "MONTHLY",
      },
    });
  }

  let ladder = await prisma.recoveryLadder.findUnique({
    where: { institutionId: institution.id },
  });
  if (!ladder) {
    ladder = await prisma.recoveryLadder.create({
      data: { institutionId: institution.id, name: "Default" },
    });
    const { textOnlyLadder } = await import("@maxtrone/core");
    const steps = textOnlyLadder();
    await prisma.recoveryStep.createMany({
      data: steps.map((s, i) => ({
        institutionId: institution.id,
        ladderId: ladder!.id,
        dayOffset: s.dayOffset,
        channel: s.channel,
        templateBody: s.templateBody,
        sortOrder: i,
      })),
    });
  }

  await prisma.whatsAppConnection.upsert({
    where: { institutionId: institution.id },
    update: { mode: "SANDBOX", displayNumber: "+923000000000" },
    create: {
      institutionId: institution.id,
      mode: "SANDBOX",
      displayNumber: "+923000000000",
      connectedAt: new Date(),
    },
  });

  await prisma.messageTemplate.upsert({
    where: {
      institutionId_name_language: {
        institutionId: institution.id,
        name: "fee_reminder",
        language: "en",
      },
    },
    update: {},
    create: {
      institutionId: institution.id,
      name: "fee_reminder",
      language: "en",
      category: "UTILITY",
      body: "Assalam o alaikum {{guardian_name}}. Fee reminder for {{student_name}}: {{amount_due}}. Pay: {{payment_link}}",
      status: "APPROVED",
    },
  });

  const seq = await prisma.sequence.findFirst({
    where: { institutionId: institution.id, name: "Inquiry, no reply" },
  });
  if (!seq) {
    const sequence = await prisma.sequence.create({
      data: {
        institutionId: institution.id,
        name: "Inquiry, no reply",
        description: "Follow up when inquiry goes cold",
      },
    });
    await prisma.sequenceStep.createMany({
      data: [
        {
          institutionId: institution.id,
          sequenceId: sequence.id,
          dayOffset: 1,
          templateBody: "Hi {{parent_name}}, just checking if you had questions about admission?",
          sortOrder: 0,
        },
        {
          institutionId: institution.id,
          sequenceId: sequence.id,
          dayOffset: 3,
          templateBody: "We still have seats in {{class_sought}}. Book a visit anytime.",
          sortOrder: 1,
        },
      ],
    });
  }

  // Phase 2/3 demo data
  const math = await prisma.subject.upsert({
    where: {
      institutionId_name: { institutionId: institution.id, name: "Mathematics" },
    },
    update: {},
    create: {
      institutionId: institution.id,
      name: "Mathematics",
      code: "MATH",
    },
  });

  let demoTest = await prisma.test.findFirst({
    where: { institutionId: institution.id, title: "Class 8 Math Quiz" },
  });
  if (!demoTest) {
    demoTest = await prisma.test.create({
      data: {
        institutionId: institution.id,
        subjectId: math.id,
        groupId: class8.id,
        title: "Class 8 Math Quiz",
        totalMarks: 10,
        testDate: new Date("2026-09-15"),
      },
    });
    await prisma.testQuestion.createMany({
      data: [
        {
          institutionId: institution.id,
          testId: demoTest.id,
          number: 1,
          topic: "Algebra",
          marks: 2,
          correctOption: "A",
        },
        {
          institutionId: institution.id,
          testId: demoTest.id,
          number: 2,
          topic: "Geometry",
          marks: 2,
          correctOption: "B",
        },
        {
          institutionId: institution.id,
          testId: demoTest.id,
          number: 3,
          topic: "Fractions",
          marks: 2,
          correctOption: "C",
        },
        {
          institutionId: institution.id,
          testId: demoTest.id,
          number: 4,
          topic: "Algebra",
          marks: 2,
          correctOption: "A",
        },
        {
          institutionId: institution.id,
          testId: demoTest.id,
          number: 5,
          topic: "Word problems",
          marks: 2,
          correctOption: "D",
        },
      ],
    });
    await prisma.mark.create({
      data: {
        institutionId: institution.id,
        testId: demoTest.id,
        studentId: student.id,
        score: 8,
        rank: 1,
        weakTopics: ["Word problems"],
      },
    });
  }

  const syllabus = await prisma.syllabusDocument.findFirst({
    where: { institutionId: institution.id, title: "Science Class 8" },
  });
  if (!syllabus) {
    const doc = await prisma.syllabusDocument.create({
      data: {
        institutionId: institution.id,
        title: "Science Class 8",
        board: "Sindh Board",
        grade: "8",
        subject: "Science",
        status: "READY",
      },
    });
    await prisma.syllabusChunk.create({
      data: {
        institutionId: institution.id,
        documentId: doc.id,
        chapter: "2",
        topic: "Photosynthesis",
        page: 55,
        content:
          "Photosynthesis converts light energy into chemical energy in plants using chlorophyll. The light reaction and dark reaction (Calvin cycle) work together.",
        embedding: [0.12, 0.44, 0.09],
      },
    });
  }

  await prisma.tutorEnrollment.upsert({
    where: {
      institutionId_studentId: {
        institutionId: institution.id,
        studentId: student.id,
      },
    },
    update: { active: true, parentConsentAt: new Date() },
    create: {
      institutionId: institution.id,
      studentId: student.id,
      parentConsentAt: new Date(),
      dailyCap: 40,
      active: true,
    },
  }).then(async (enroll) => {
    const sub = await prisma.tutorSubscription.findFirst({
      where: { enrollmentId: enroll.id, status: "ACTIVE" },
    });
    if (!sub) {
      await prisma.tutorSubscription.create({
        data: {
          institutionId: institution.id,
          enrollmentId: enroll.id,
          pricePaisa: 75_000,
          status: "ACTIVE",
        },
      });
    }
  });

  const existingRoute = await prisma.transportRoute.findFirst({
    where: { institutionId: institution.id, name: "Gulberg Route" },
  });
  if (!existingRoute) {
    await prisma.transportRoute.create({
      data: {
        institutionId: institution.id,
        name: "Gulberg Route",
        driverPhone: "+923007778889",
        vehicleLabel: "Van LE-88",
      },
    });
  }

  await prisma.competitorWatch.create({
    data: {
      institutionId: institution.id,
      name: "City Stars Academy",
      area: "Gulberg",
      feeNotes: "PKR 18,000/month Class 8",
      batchNotes: "Evening batch 4–6pm",
      adNotes: "Facebook ads pushing free demo",
      lastCheckedAt: new Date(),
    },
  }).catch(() => null);

  await prisma.instagramConnection.upsert({
    where: { institutionId: institution.id },
    update: { pageId: "sandbox-page", connectedAt: new Date() },
    create: {
      institutionId: institution.id,
      pageId: "sandbox-page",
      connectedAt: new Date(),
    },
  });

  const igConn = await prisma.instagramConnection.findUnique({
    where: { institutionId: institution.id },
  });
  if (igConn) {
    const thread = await prisma.instagramThread.upsert({
      where: {
        institutionId_igUserId: {
          institutionId: institution.id,
          igUserId: "demo.parent.1",
        },
      },
      update: { lastMessageAt: new Date() },
      create: {
        institutionId: institution.id,
        connectionId: igConn.id,
        igUserId: "demo.parent.1",
        displayName: "Sana Malik",
        status: "OPEN",
        lastMessageAt: new Date(),
      },
    });
    const msgCount = await prisma.instagramMessage.count({
      where: { threadId: thread.id },
    });
    if (msgCount === 0) {
      await prisma.instagramMessage.createMany({
        data: [
          {
            institutionId: institution.id,
            threadId: thread.id,
            direction: "INBOUND",
            body: "Hi, what is the fee for Class 8?",
          },
          {
            institutionId: institution.id,
            threadId: thread.id,
            direction: "OUTBOUND",
            body: "Assalam o alaikum! Class 8 tuition is PKR 15,000/month.",
            isAi: true,
          },
        ],
      });
    }
  }

  await prisma.knowledgeBaseEntry.create({
    data: {
      institutionId: institution.id,
      category: "calendar",
      title: "School holidays",
      body: "School is open Monday–Friday. Next PTM is on the first Saturday of next month.",
    },
  }).catch(() => null);

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
