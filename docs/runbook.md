# Runbook

## Hosting

| Component | Platform | Notes |
|---|---|---|
| Web (UI, server actions, API routes) | **Vercel** | Root directory `apps/web`, `apps/web/vercel.json` pins install/build commands. |
| Worker (pg-boss render jobs) | **Hostinger VPS** | `docker-compose.prod.yml`, image built from `apps/worker/Dockerfile`. |
| Database | **Neon Postgres** | Pooled URL for Vercel; direct URL for migrations and the worker. |
| Storage | **Cloudflare R2** | S3-compatible; MinIO for local dev. |
| Email | **Resend** | OTP codes; `EMAIL_PROVIDER=resend`. |
| Auth | **Better Auth** | Google social sign-in + email OTP only. Passwords and reset/verification links are disabled. |

The web app is the only public entry point. The worker has no inbound traffic except
the Docker health probe on port 3002, which is not published to the host.

## Environments

| Env | Web | Worker | DB | Bucket | Provider |
|---|---|---|---|---|---|
| local | localhost:3001 | local tsx | docker :5434 | MinIO | fake |
| staging | Vercel preview | VPS staging container | Neon staging | R2 staging | fake |
| production | Vercel prod | VPS prod container | Neon prod | R2 prod | openai |

Use separate Neon projects and R2 buckets for staging and production. Never share
`BETTER_AUTH_SECRET`, provider keys or bucket credentials between environments.

## Environment variables

The full list is in `.env.example` (local) and `deploy/.env.production.example`
(VPS). The web values live in the Vercel project settings; the worker values live
in `/opt/roomdesigner/.env.production` on the VPS.

Rules:
- `APP_URL` and `BETTER_AUTH_URL` must be the public HTTPS Vercel domain.
- Vercel uses the **pooled** Neon `DATABASE_URL`; the worker and migrations use
  the **direct** Neon URL. pg-boss and long-lived connections should avoid the
  transaction pooler, so set `QUEUE_DATABASE_URL` in Vercel to the direct URL.
  The worker can leave `QUEUE_DATABASE_URL` empty because its `DATABASE_URL` is
  already direct.
- Never set `DEV_AUTH_BYPASS` or `E2E` in production.
- `BETTER_AUTH_SECRET` is at least 32 random characters (`openssl rand -base64 48`).
- `WORKER_HEALTH_PORT` defaults to `3002` and is used by the container healthcheck;
  set it to `0` only to disable the probe deliberately.
- Every new variable must be added to `.env.example`, the zod schema in
  `packages/config/src/env.ts` and `turbo.json`'s `globalEnv`.

## Auth and email setup

- Google Cloud OAuth client, authorised redirect URI:
  `https://<APP_URL host>/api/auth/callback/google`.
- `APP_URL` and `BETTER_AUTH_URL` must match the public Vercel domain.
- Resend must have a verified sending domain; set `EMAIL_FROM` to that domain.
- Configure DNS: SPF, DKIM and DMARC for the sending domain. Verify that OTP
  emails land in the inbox before launch.
- OTPs are 6 digits and expire after 5 minutes.
- Playwright sets `E2E=1` (non-production only) to use the fixed code `123456`.

## One-time setup

1. Create a Neon project and copy both connection strings (pooled and direct).
2. Create an R2 bucket and an API token with object read/write. Add CORS:
   - Allowed origin: `https://<your-domain>`
   - Allowed methods: `GET, PUT, HEAD`
   - Allowed headers: `*`
3. Create the Vercel project from this repo:
   - Root Directory: `apps/web`
   - Enable "Include source files outside of the Root Directory".
   - Framework preset: Next.js (also pinned in `apps/web/vercel.json`).
   - Install command: `pnpm install --frozen-lockfile` (pinned).
   - Build command: `pnpm --filter @roomdesigner/web build` (pinned).
   - The `prebuild` hook runs `prisma generate`.
4. Add every web env var in Vercel. Do **not** set `DEV_AUTH_BYPASS` or `E2E`.
5. Create a Vercel Deploy Hook for `main`/`master`; save it as
   `VERCEL_DEPLOY_HOOK_URL`. Disable Vercel Git auto-deploy if the CI/CD workflow
   should be the only production deploy trigger (keep preview deployments if you
   want PR previews).
6. Bootstrap the VPS (Ubuntu 22.04/24.04):
   ```bash
   sudo bash deploy/vps-bootstrap.sh
   sudo mkdir -p /opt/roomdesigner
   ```
   Copy `docker-compose.prod.yml`, `deploy/rollback-worker.sh` and
   `deploy/.env.production.example` to `/opt/roomdesigner/`, rename the example to
   `.env.production`, fill in the real values and `chmod 600 .env.production`.
   Log in to GHCR once: `docker login ghcr.io`.
7. Add GitHub repository secrets:

| Secret | Used by | Required |
|---|---|---|
| `NEON_DIRECT_DATABASE_URL` | migration job | yes |
| `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` | worker deploy | yes |
| `VPS_PORT` | worker deploy (default 22) | no |
| `VPS_APP_DIR` | worker deploy (default `/opt/roomdesigner`) | no |
| `VERCEL_DEPLOY_HOOK_URL` | web deploy | yes |
| `PRODUCTION_URL` | post-deploy smoke test | recommended |
| `VPS_GHCR_TOKEN` | long-lived read-only GHCR pull token for manual rollbacks | recommended |

Worker-only variables (`DATABASE_URL` direct, AI, S3, Resend, Google) live in
`/opt/roomdesigner/.env.production`; web variables live in Vercel. Provider
secrets are never stored in GitHub.

Optionally set the repository variable `WORKER_PLATFORM` (default
`linux/amd64`) if the VPS is ARM64.

## CI/CD

`.github/workflows/ci.yml` runs on every push and pull request:

1. Install with a frozen lockfile, `prisma validate`, `prisma generate`,
   `prisma migrate deploy` against the CI Postgres service.
2. Typecheck, lint, unit/integration tests.
3. Start MinIO for upload/render tests, run Playwright (fake provider), then
   run a production build.
4. Build the worker Docker image (no push) to catch Dockerfile regressions.

`.github/workflows/deploy.yml` runs only after CI succeeds for a **push** to
`main`/`master` (or via manual `workflow_dispatch`):

1. `migrate` — `prisma migrate deploy` against `NEON_DIRECT_DATABASE_URL`.
2. `worker` — build/push the image to GHCR, then SSH to the VPS, pull the exact
   git SHA, and `docker compose up -d --wait` (waits for the healthcheck).
3. `web` — trigger the Vercel Deploy Hook, then poll `PRODUCTION_URL/api/health`
   for up to 5 minutes.

All three jobs use the `production` GitHub Environment. Add required reviewers
to that environment if production deploys need manual approval.

Migrations run before the new web/worker version starts. Keep them additive so
the previous version can still run during a rollback.

## Manual deploy

```bash
# Web (Vercel builds with the project's env)
curl -X POST "$VERCEL_DEPLOY_HOOK_URL"

# Worker on the VPS
cd /opt/roomdesigner
export GHCR_OWNER=<your-github-owner>
export IMAGE_TAG=<git-sha>
docker compose -f docker-compose.prod.yml pull worker
docker compose -f docker-compose.prod.yml up -d --remove-orphans --wait --wait-timeout 120 worker

# Migrations (manual)
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
```

## Rollback

- **Web**: promote the previous deployment in the Vercel dashboard.
- **Worker**:
  ```bash
  cd /opt/roomdesigner
  IMAGE_TAG=<previous-sha> GHCR_OWNER=<owner> ./rollback-worker.sh
  ```
  The script pulls the previous image and waits for the container healthcheck.
- **Database**: migrations must be backward compatible. Restore from Neon PITR
  only for destructive failures; record the incident in `DECISIONS.md`.

## Worker operations

- Logs: structured JSON on stdout (`channel: "worker"`); `docker compose logs -f worker`.
- Health: `GET http://127.0.0.1:3002/health` inside the container; Docker marks
  the container unhealthy if the database round-trip fails.
- Restart policy: `unless-stopped`; graceful shutdown on SIGTERM, with a 40s
  forced-exit ceiling under Docker's 45s grace period.
- Stuck jobs: the sweeper fails + refunds `RUNNING` jobs older than 10 minutes.
- Failed jobs: inspect `RenderJob` with status `FAILED`; refunds are idempotent.
- The worker needs `DATABASE_URL`, `BETTER_AUTH_SECRET`, `APP_URL`, S3 and AI env
  because `getServerEnv()` validates the full server schema at boot.
- The container runs as a non-root user with a read-only filesystem, all Linux
  capabilities dropped and `no-new-privileges`. Temporary files go to a 128 MB
  tmpfs mounted at `/tmp`.

## Backups and restore drill

1. Enable Neon automated daily backups and point-in-time recovery.
2. Create a scratch database from a backup/branch.
3. Point a staging worker at it (`DATABASE_URL`).
4. Run the smoke flow (OTP sign-in → project → fake render) against staging.
5. Record the date, time taken and any manual steps here.

## Secret rotation

- Generate a new `BETTER_AUTH_SECRET` with `openssl rand -base64 48`; update
  Vercel and the VPS env file together, then redeploy both. Expect existing
  sessions to be invalidated.
- Rotate OpenAI, R2 and Resend keys in the provider console first, then update
  Vercel/VPS env and redeploy. Revoke the old key after the smoke test passes.
- Never commit `.env`, `.env.production`, deploy keys or provider keys.

## Credit adjustments

Insert an `ADJUSTMENT` ledger row with a note; balance is `SUM(delta)` and the
ledger is append-only.
