import { PrismaClient, OnboardingStep, PlanCode, MembershipRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@postpilot.ai";
  const user = await prisma.user.upsert({
    where: { email },
    update: { name: "Demo Owner" },
    create: {
      email,
      name: "Demo Owner",
      emailVerified: new Date(),
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: "demo-agency" },
    update: { name: "Demo Agency" },
    create: {
      name: "Demo Agency",
      slug: "demo-agency",
    },
  });

  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: {
      planCode: PlanCode.PRO,
      status: "ACTIVE",
      creditBalance: 500,
      brandLimit: 3,
      platformLimit: 5,
    },
    create: {
      organizationId: org.id,
      planCode: PlanCode.PRO,
      status: "ACTIVE",
      creditBalance: 500,
      brandLimit: 3,
      platformLimit: 5,
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: { role: MembershipRole.OWNER },
    create: {
      organizationId: org.id,
      userId: user.id,
      role: MembershipRole.OWNER,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: {
      organizationId_slug: {
        organizationId: org.id,
        slug: "lumen-cafe",
      },
    },
    update: {
      name: "Lumen Café",
      isDemo: true,
      onboardingStep: OnboardingStep.COMPLETE,
      timezone: "America/New_York",
    },
    create: {
      organizationId: org.id,
      name: "Lumen Café",
      slug: "lumen-cafe",
      isDemo: true,
      onboardingStep: OnboardingStep.COMPLETE,
      timezone: "America/New_York",
      contentLanguages: ["en"],
      onboardingData: {
        business: {
          businessName: "Lumen Café",
          websiteUrl: "https://example.com",
          industry: "Food & Beverage",
          niche: "Specialty coffee",
          location: "Brooklyn, NY",
          usp: "Single-origin pour-overs and calm weekday ritual.",
        },
      },
    },
  });

  await prisma.brandProfile.upsert({
    where: { workspaceId: workspace.id },
    update: {
      businessName: "Lumen Café",
      websiteUrl: "https://example.com",
      industry: "Food & Beverage",
      niche: "Specialty coffee",
      location: "Brooklyn, NY",
      usp: "Single-origin pour-overs and calm weekday ritual.",
      goals: ["awareness", "community"],
      toneSliders: { formalCasual: 65, seriousPlayful: 55, boldSubtle: 40 },
      wordsToUse: ["ritual", "origin", "warm"],
      wordsToAvoid: ["cheap", "hustle"],
    },
    create: {
      workspaceId: workspace.id,
      businessName: "Lumen Café",
      websiteUrl: "https://example.com",
      industry: "Food & Beverage",
      niche: "Specialty coffee",
      location: "Brooklyn, NY",
      usp: "Single-origin pour-overs and calm weekday ritual.",
      goals: ["awareness", "community"],
      toneSliders: { formalCasual: 65, seriousPlayful: 55, boldSubtle: 40 },
      wordsToUse: ["ritual", "origin", "warm"],
      wordsToAvoid: ["cheap", "hustle"],
      audienceJson: {
        demographics: "Neighborhood professionals 25–45",
        pains: "Chaotic mornings, mediocre coffee",
        desires: "A calm daily ritual and community cafe",
      },
    },
  });

  const existingKit = await prisma.brandKit.findFirst({
    where: { workspaceId: workspace.id, isPrimary: true },
  });

  if (!existingKit) {
    await prisma.brandKit.create({
      data: {
        workspaceId: workspace.id,
        name: "Primary",
        isPrimary: true,
        primaryColor: "#0F3D3E",
        secondaryColor: "#E8D5B7",
        accentColor: "#D97706",
        backgroundColor: "#FAF7F2",
        textColor: "#14212B",
        fontHeading: "Fraunces",
        fontBody: "Sora",
      },
    });
  }

  await prisma.brandDNA.deleteMany({ where: { workspaceId: workspace.id } });
  await prisma.brandDNA.create({
    data: {
      workspaceId: workspace.id,
      version: 1,
      isActive: true,
      voiceRules: {
        tone: "warm, grounded, quietly confident",
        sentenceLength: "short to medium",
      },
      contentPillars: [
        { name: "Origin stories", weight: 30 },
        { name: "Cafe ritual", weight: 30 },
        { name: "Community", weight: 20 },
        { name: "Menu craft", weight: 20 },
      ],
      audiencePersona: {
        name: "Maya",
        summary: "Remote designer who wants a calm third place",
      },
      doList: ["Celebrate craft", "Invite conversation"],
      dontList: ["Hard-sell discounts", "Trend-jack without relevance"],
      visualStyleGuide: {
        photography: "natural light, ceramic, steam, soft grain",
        avoid: "neon overlays, stock office vibes",
      },
      rawDocument:
        "Lumen Café Brand DNA v1 — warm specialty coffee brand with calm ritual positioning.",
    },
  });

  console.log("Seeded demo workspace:");
  console.log(`  user: ${email}`);
  console.log(`  org:  ${org.slug}`);
  console.log(`  workspace: ${workspace.slug}`);
  console.log("  Sign in with AUTH_DEV_LOGIN using the demo email.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
