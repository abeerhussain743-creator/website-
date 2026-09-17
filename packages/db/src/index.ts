import fs from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { PrismaClient } from "@prisma/client";

function loadNearestEnv() {
  if (process.env.DATABASE_URL) return;

  const starts = [process.cwd(), path.resolve(__dirname, "../.."), path.resolve(__dirname, "../../..")];
  const seen = new Set<string>();

  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 6; i++) {
      if (seen.has(dir)) break;
      seen.add(dir);
      const envPath = path.join(dir, ".env");
      if (fs.existsSync(envPath)) {
        loadDotenv({ path: envPath, quiet: true });
        if (process.env.DATABASE_URL) return;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
}

loadNearestEnv();

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
export default prisma;
