import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp and the Prisma runtime are native/server modules: keep them out of
  // the client/server bundle graph.
  serverExternalPackages: ["sharp", "@prisma/client", "@prisma/adapter-pg", "@react-pdf/renderer"],
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
  async headers() {
    return [
      {
        source: "/p/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/brief/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/share/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
