import { PrismaClient } from "@prisma/client";
import { createCipheriv, randomBytes } from "node:crypto";

/** Dev helper: demo org/store with fake encrypted token for UI testing. */
const prisma = new PrismaClient();

function encrypt(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

async function main() {
  const key =
    process.env.TOKEN_ENCRYPTION_KEY ??
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  const org = await prisma.organization.upsert({
    where: { slug: "demo-store" },
    create: { name: "Demo Store Org", slug: "demo-store" },
    update: {},
  });

  const freePlan = await prisma.plan.findUnique({ where: { code: "FREE" } });
  if (freePlan) {
    await prisma.subscription.upsert({
      where: { organizationId: org.id },
      create: {
        organizationId: org.id,
        planId: freePlan.id,
        status: "TRIALING",
      },
      update: {},
    });
  }

  const store = await prisma.store.upsert({
    where: { shopDomain: "demo-store.myshopify.com" },
    create: {
      organizationId: org.id,
      shopDomain: "demo-store.myshopify.com",
      name: "Demo Store",
      currency: "USD",
      timezone: "America/New_York",
      planDisplayName: "Development",
      isActive: true,
    },
    update: { isActive: true, name: "Demo Store" },
  });

  await prisma.shopifyConnection.upsert({
    where: { storeId: store.id },
    create: {
      storeId: store.id,
      accessTokenEncrypted: encrypt("shpat_demo_not_a_real_token", key),
      scope: "read_products,write_products",
      lastVerifiedAt: new Date(),
    },
    update: {
      accessTokenEncrypted: encrypt("shpat_demo_not_a_real_token", key),
      lastVerifiedAt: new Date(),
    },
  });

  console.log("Demo store ready:", store.shopDomain, store.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
