# Worker image (Vercel hosts the web app; the worker runs on a VPS).
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/auth/package.json packages/auth/
COPY packages/shared/package.json packages/shared/
COPY packages/ai/package.json packages/ai/
COPY packages/storage/package.json packages/storage/
COPY packages/estimate/package.json packages/estimate/
COPY packages/pdf/package.json packages/pdf/
COPY packages/billing/package.json packages/billing/
RUN pnpm install --frozen-lockfile --prod=false

FROM deps AS runner
COPY . .
# Prisma client is generated at build time (schema + generated output).
RUN pnpm --filter @roomdesigner/db generate
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@roomdesigner/worker", "start"]
