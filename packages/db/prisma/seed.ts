import { PrismaClient, PlanCode } from "@prisma/client";

const prisma = new PrismaClient();

const plans: Array<{
  code: PlanCode;
  name: string;
  recordsPerMonth: number;
  importsPerMonth: number;
  exportsPerMonth: number;
  maxStores: number;
  maxScheduledJobs: number;
  backupRetentionDays: number;
  maxTeamMembers: number;
  advancedTransforms: boolean;
}> = [
  {
    code: "FREE",
    name: "Free",
    recordsPerMonth: 1_000,
    importsPerMonth: 5,
    exportsPerMonth: 5,
    maxStores: 1,
    maxScheduledJobs: 0,
    backupRetentionDays: 0,
    maxTeamMembers: 1,
    advancedTransforms: false,
  },
  {
    code: "STARTER",
    name: "Starter",
    recordsPerMonth: 25_000,
    importsPerMonth: 50,
    exportsPerMonth: 50,
    maxStores: 2,
    maxScheduledJobs: 5,
    backupRetentionDays: 14,
    maxTeamMembers: 3,
    advancedTransforms: false,
  },
  {
    code: "GROWTH",
    name: "Growth",
    recordsPerMonth: 150_000,
    importsPerMonth: 200,
    exportsPerMonth: 200,
    maxStores: 5,
    maxScheduledJobs: 25,
    backupRetentionDays: 30,
    maxTeamMembers: 10,
    advancedTransforms: true,
  },
  {
    code: "PRO",
    name: "Pro",
    recordsPerMonth: 1_000_000,
    importsPerMonth: 1_000,
    exportsPerMonth: 1_000,
    maxStores: 15,
    maxScheduledJobs: 100,
    backupRetentionDays: 90,
    maxTeamMembers: 25,
    advancedTransforms: true,
  },
  {
    code: "ENTERPRISE",
    name: "Enterprise",
    recordsPerMonth: 10_000_000,
    importsPerMonth: 10_000,
    exportsPerMonth: 10_000,
    maxStores: 100,
    maxScheduledJobs: 1_000,
    backupRetentionDays: 365,
    maxTeamMembers: 200,
    advancedTransforms: true,
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      create: plan,
      update: plan,
    });
  }
  console.log(`Seeded ${plans.length} plans`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
