import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@maxtrone/ui",
    "@maxtrone/core",
    "@maxtrone/db",
    "@maxtrone/providers",
  ],
  experimental: {
    optimizePackageImports: ["lucide-react", "@maxtrone/ui"],
  },
};

export default nextConfig;
