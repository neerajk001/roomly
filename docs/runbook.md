# Runbook

## Hosting (G3 decision)
- **Web**: Vercel (Next.js 16). Set the project root to `apps/web` with the pnpm monorepo
  auto-detection, or use the repo root and the build command
  `pnpm --filter @roomdesigner/web build`.
- **Worker**: Docker container from `apps/worker/Dockerfile` on a VPS with Docker + Postgres access.
- **Database**: managed Postgres (Neon/Supabase) with automated backups + PITR.
- **Storage**: Cloudflare R2 (S3-compatible; MinIO locally).

## Environments
| Env | Web | Worker | DB | Bucket | Provider |
|---|---|---|---|---|---|
| local | localhost:3001 | local tsx | docker :5434 | MinIO | fake |
| staging | Vercel preview | VPS staging container | managed staging | staging | fake |
| production | Vercel prod | VPS prod container | managed prod | prod | openai |

## Deploy
1. Merge to `main` → CI (install, prisma validate, generate, migrate deploy, typecheck, lint, test, E2E, build).
2. Run `pnpm --filter @roomdesigner/db exec prisma migrate deploy` before the new web/worker version
   starts receiving traffic.
3. Vercel deploys the web build automatically.
4. On the VPS: `docker compose pull worker && docker compose up -d worker`
   (or `docker build -f apps/worker/Dockerfile -t roomdesigner-worker .` then recreate).

## Rollback
- Vercel: promote the previous deployment.
- Worker: re-run the previous image tag; migrations must be backward compatible (additive first).

## Worker operations
- Logs: structured JSON on stdout (`channel: "worker"`).
- Stuck jobs: sweeper fails + refunds `RUNNING` jobs older than 10 min every 10 minutes.
- Failed jobs: inspect `RenderJob` with status FAILED; refunds are idempotent ledger rows.

## Secrets
All via environment variables (Vercel project env + VPS `.env`/Docker secrets). Never commit.
Rotate `BETTER_AUTH_SECRET` and provider keys before launch. Required env list: `.env.example`.

## Restore drill (to complete on the managed DB)
1. Create a scratch database from a backup.
2. Point a staging worker at it (`DATABASE_URL`).
3. Run the smoke flow (sign-up → project → fake render) against staging.
4. Record time taken and any manual steps here.

## Credit adjustments
Insert an `ADJUSTMENT` ledger row (admin tool in V6 observability backlog) with a note; balance is
`SUM(delta)` and the ledger is append-only.
