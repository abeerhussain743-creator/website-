/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@postpilot/db",
    "@postpilot/shared",
    "@postpilot/storage",
    "@postpilot/jobs",
  ],
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
