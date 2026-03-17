import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-70cc32fd59eb4f99855e79916b571640.r2.dev",
      },
    ],
  },
};

export default nextConfig;
