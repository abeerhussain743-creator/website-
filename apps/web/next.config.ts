import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "node:path";

// Load monorepo-root .env so DATABASE_URL etc. work without copying into apps/web.
// next.config is evaluated with cwd = apps/web when using workspace scripts.
const monorepoRoot = path.resolve(process.cwd(), "../..");
loadEnvConfig(monorepoRoot);
loadEnvConfig(process.cwd()); // allow apps/web/.env overrides

const nextConfig: NextConfig = {
  transpilePackages: [
    "@shopdata/db",
    "@shopdata/shared",
    "@shopdata/shopify",
    "@shopdata/files",
    "@shopdata/jobs",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "32mb",
    },
  },
};

export default nextConfig;
