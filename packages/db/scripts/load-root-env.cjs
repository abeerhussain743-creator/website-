/**
 * Load monorepo-root `.env` (and optional packages/db/.env override)
 * so Prisma CLI + seed scripts work when cwd is packages/db.
 */
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const dbRoot = path.resolve(__dirname, "..");
const monorepoRoot = path.resolve(dbRoot, "../..");

for (const envPath of [
  path.join(monorepoRoot, ".env"),
  path.join(dbRoot, ".env"),
]) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false, quiet: true });
  }
}
