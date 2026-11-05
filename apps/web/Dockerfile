# syntax=docker/dockerfile:1.7
#
# Production web image. Runs the Next.js UI, server actions and API routes on
# the Hostinger VPS behind Caddy (see docker-compose.prod.yml).

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base
RUN corepack enable && apk add --no-cache tini libc6-compat
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
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
# Build-time placeholders. Runtime values come from .env.production.
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/roomdesigner"
ENV BETTER_AUTH_SECRET="build-time-only-secret-build-time-only-secret"
ENV APP_URL="http://localhost:3000"
ENV BETTER_AUTH_URL="http://localhost:3000"
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @roomdesigner/db generate
RUN pnpm --filter @roomdesigner/web build
# Runtime cache is a tmpfs; don't bake the build cache into the image.
RUN rm -rf apps/web/.next/cache

FROM base AS runner
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.title="roomdesigner-web" \
      org.opencontainers.image.description="Next.js web app for RoomDesigner" \
      org.opencontainers.image.revision="${GIT_SHA}"

RUN addgroup -S app && adduser -S app -G app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOME=/tmp

COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build --chown=app:app /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build --chown=app:app /app/apps/web ./apps/web
COPY --from=build --chown=app:app /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=build --chown=app:app /app/packages ./packages

USER app
EXPOSE 3000
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:3000/api/health" >/dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["apps/web/node_modules/.bin/next", "start", "apps/web", "-H", "0.0.0.0", "-p", "3000"]
