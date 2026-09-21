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
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
