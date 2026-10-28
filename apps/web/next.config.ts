import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  transpilePackages: [
    "@roomdesigner/config",
    "@roomdesigner/db",
    "@roomdesigner/auth",
    "@roomdesigner/shared",
    "@roomdesigner/estimate",
    "@roomdesigner/ai",
    "@roomdesigner/storage",
    "@roomdesigner/pdf",
    "@roomdesigner/billing",
  ],
};

export default nextConfig;
