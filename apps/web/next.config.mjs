import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@postpilot/db",
    "@postpilot/shared",
    "@postpilot/storage",
    "@postpilot/jobs",
    "@postpilot/ai",
  ],
  experimental: {
    serverComponentsExternalPackages: ["@postpilot/design"],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "@resvg/resvg-js": false,
        satori: false,
      };
    }
    void __dirname;
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
