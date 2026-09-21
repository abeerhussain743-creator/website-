import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createTenantClient, TenantScopeError } from "../src/tenant-client.js";

const prisma = new PrismaClient();

describe("tenant isolation", () => {
  let institutionA: string;
  let institutionB: string;
  let studentA: string;
  let studentB: string;

  beforeAll(async () => {
    const plan = await prisma.plan.upsert({
      where: { code: "STARTER" },
      update: {},
      create: { code: "STARTER", name: "Starter" },
    });

    const a = await prisma.institution.upsert({
      where: { slug: "iso-a" },
      update: {},
      create: {
        name: "Iso A",
        slug: "iso-a",
        type: "SCHOOL",
        planId: plan.id,
      },
    });
    const b = await prisma.institution.upsert({
      where: { slug: "iso-b" },
      update: {},
      create: {
        name: "Iso B",
        slug: "iso-b",
        type: "SCHOOL",
        planId: plan.id,
      },
    });
    institutionA = a.id;
    institutionB = b.id;

    const sa = await prisma.student.create({
      data: {
        institutionId: institutionA,
        fullName: "Student A",
        registrationNo: `A-${Date.now()}`,
      },
    });
    const sb = await prisma.student.create({
      data: {
        institutionId: institutionB,
        fullName: "Student B",
        registrationNo: `B-${Date.now()}`,
      },
    });
    studentA = sa.id;
    studentB = sb.id;
  });

  afterAll(async () => {
    await prisma.student.deleteMany({
      where: { institutionId: { in: [institutionA, institutionB] } },
    });
    await prisma.institution.deleteMany({
      where: { id: { in: [institutionA, institutionB] } },
    });
    await prisma.$disconnect();
  });

  it("lists only the current tenant's students", async () => {
    const db = createTenantClient(prisma, institutionA);
    const rows = await db.student.findMany();
    expect(rows.every((s) => s.institutionId === institutionA)).toBe(true);
    expect(rows.some((s) => s.id === studentA)).toBe(true);
    expect(rows.some((s) => s.id === studentB)).toBe(false);
  });

  it("cannot read another tenant's student by id", async () => {
    const db = createTenantClient(prisma, institutionA);
    const found = await db.student.findFirst({ where: { id: studentB } });
    expect(found).toBeNull();
  });

  it("rejects cross-tenant where clauses", async () => {
    const db = createTenantClient(prisma, institutionA);
    await expect(
      db.student.findMany({ where: { institutionId: institutionB } }),
    ).rejects.toBeInstanceOf(TenantScopeError);
  });

  it("forces institutionId on create", async () => {
    const db = createTenantClient(prisma, institutionA);
    const created = await db.student.create({
      // institutionId is injected by the tenant extension
      data: {
        fullName: "Scoped Create",
        registrationNo: `SC-${Date.now()}`,
      } as never,
    });
    expect(created.institutionId).toBe(institutionA);
    await prisma.student.delete({ where: { id: created.id } });
  });

  it("rejects creating into another tenant", async () => {
    const db = createTenantClient(prisma, institutionA);
    await expect(
      db.student.create({
        data: {
          institutionId: institutionB,
          fullName: "Evil",
          registrationNo: `EV-${Date.now()}`,
        },
      }),
    ).rejects.toBeInstanceOf(TenantScopeError);
  });
});
