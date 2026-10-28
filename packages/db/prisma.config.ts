import fs from "node:fs";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 7 does not load .env files automatically. Walk up from the working
// directory to find the repo-root .env (same rule as packages/config/env.ts).
let dir = process.cwd();
for (let i = 0; i < 4; i++) {
  const candidate = path.join(dir, ".env");
  if (fs.existsSync(candidate)) {
    try {
      process.loadEnvFile(candidate);
    } catch {
      // Malformed .env: the CLI will report the missing/invalid variable.
    }
    break;
  }
  const parent = path.dirname(dir);
  if (parent === dir) break;
  dir = parent;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
