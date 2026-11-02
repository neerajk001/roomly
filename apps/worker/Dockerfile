# syntax=docker/dockerfile:1.7
#
# Production worker image. The Next.js web app is hosted on Vercel; this image
# runs the pg-boss worker on the Hostinger VPS (see docker-compose.prod.yml).
#
# Build:  docker build -f apps/worker/Dockerfile -t roomdesigner-worker .
# Run:    see docker-compose.prod.yml / docs/runbook.md

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base
RUN corepack enable && apk add --no-cache tini
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

# Install the full workspace so tsx, Prisma, sharp and the workspace packages
# are available at runtime. The image is deployed as a single long-lived
# container, so a simple reproducible install beats a fragile prune step.
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/web/package.json ./apps/web/
COPY packages/ai/package.json ./packages/ai/
COPY packages/auth/package.json ./packages/auth/
COPY packages/billing/package.json ./packages/billing/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/estimate/package.json ./packages/estimate/
COPY packages/pdf/package.json ./packages/pdf/
COPY packages/shared/package.json ./packages/shared/
COPY packages/storage/package.json ./packages/storage/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# Prisma generate does not connect to the database, but Prisma 7 requires a
# syntactically valid URL. Runtime always overrides this via env_file.
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/roomdesigner"
RUN pnpm --filter @roomdesigner/db generate
RUN pnpm --filter @roomdesigner/worker typecheck

FROM base AS runner
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.title="roomdesigner-worker" \
      org.opencontainers.image.description="pg-boss render worker for RoomDesigner" \
      org.opencontainers.image.revision="${GIT_SHA}"

RUN addgroup -S app && adduser -S app -G app

ENV NODE_ENV=production
ENV WORKER_HEALTH_PORT=3002
ENV HOME=/tmp
ENV XDG_CACHE_HOME=/tmp/.cache

COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build --chown=app:app /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build --chown=app:app /app/apps/worker ./apps/worker
# Keep the workspace graph intact for pnpm commands (e.g. the migrate profile);
# the web app itself is not part of the worker runtime.
COPY --from=build --chown=app:app /app/apps/web/package.json ./apps/web/package.json
COPY --from=build --chown=app:app /app/packages ./packages

USER app
EXPOSE 3002
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${WORKER_HEALTH_PORT}/health" >/dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
# Call tsx directly instead of through pnpm: pnpm's dependency-state check is
# unnecessary in the immutable image and can try to write under /app.
CMD ["node_modules/.bin/tsx", "apps/worker/src/index.ts"]
