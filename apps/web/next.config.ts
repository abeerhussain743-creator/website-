import type { NextConfig } from "next";

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
