# Runbook

## Hosting

| Component | Where | Notes |
|---|---|---|
| TLS / reverse proxy | **Caddy** on the Hostinger VPS | Automatic HTTPS, HTTP→HTTPS redirect, proxies to `web:3000`. |
| Web (UI, server actions, API routes) | **Hostinger VPS**, Docker | `apps/web/Dockerfile`, `docker-compose.prod.yml` service `web`. |
| Worker (pg-boss render jobs) | **Hostinger VPS**, Docker | `apps/worker/Dockerfile`, service `worker`. |
| Database | **Neon Postgres** | Pooled URL for the web runtime; direct URL for the worker, migrations and pg-boss. |
| Storage | **Cloudinary** | Signed browser uploads, private assets, expiring signed delivery URLs. MinIO/S3 is local/CI only. |
| Email | **Resend** | OTP codes; `EMAIL_PROVIDER=resend`. |
| Auth | **Better Auth** | Google social sign-in + email OTP only. Passwords and reset/verification links are disabled. |

The whole application runs on the VPS. Caddy is the only public entry point;
the web, worker and health ports are internal to the Docker network.

## Environments

| Env | Web + worker | Caddy | DB | Storage | Provider |
|---|---|---|---|---|---|
| local | localhost:3001 + local tsx | — | docker :5434 | MinIO (`STORAGE_PROVIDER=s3`) | fake |
| staging | VPS staging stack | staging domain | Neon staging | Cloudinary staging | fake |
| production | VPS production stack | production domain | Neon prod | Cloudinary prod | openai |

Use separate Neon projects and Cloudinary product environments (or accounts)
for staging and production. Never share `BETTER_AUTH_SECRET`, provider keys or
Cloudinary credentials between environments.

## Environment variables

Production values live in `/opt/roomdesigner/.env.production` on the VPS. The
full list is in `deploy/.env.production.example`; local values are in
`.env.example`.

Rules:
- `DOMAIN` is the public domain (no scheme). Point its DNS A/AAAA record at the VPS.
- `APP_URL` and `BETTER_AUTH_URL` must be `https://<DOMAIN>`.
- The VPS stack uses the **direct** (non-pooled) Neon `DATABASE_URL` for both
  web and worker. `QUEUE_DATABASE_URL` can stay empty; pg-boss falls back to
  `DATABASE_URL`. Migrations also use the direct URL.
- `STORAGE_PROVIDER=cloudinary` with `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`
  and `CLOUDINARY_API_SECRET`.
- Never set `DEV_AUTH_BYPASS` or `E2E` in production.
- `BETTER_AUTH_SECRET` is at least 32 random characters (`openssl rand -base64 48`).
- Every new variable must be added to `.env.example`, the zod schema in
  `packages/config/src/env.ts` and `turbo.json`'s `globalEnv`.

## Auth and email setup

- Google Cloud OAuth client, authorised redirect URI:
  `https://<DOMAIN>/api/auth/callback/google`.
- Resend must have a verified sending domain; set `EMAIL_FROM` to that domain.
- Configure DNS: SPF, DKIM and DMARC for the sending domain. Verify that OTP
  emails land in the inbox before launch.
- OTPs are 6 digits and expire after 5 minutes.
- Playwright sets `E2E=1` (non-production only) to use the fixed code `123456`.

## One-time setup

1. Create a Neon project and copy both connection strings (pooled + direct).
2. Create a Cloudinary product environment and copy the cloud name, API key and
   API secret. Enable PDF delivery if proposal PDFs are stored in Cloudinary.
3. Bootstrap the VPS (Ubuntu 22.04/24.04):
   ```bash
   sudo bash deploy/vps-bootstrap.sh
   ```
   This installs Docker, enables unattended updates, fail2ban and opens SSH,
   80/tcp, 443/tcp and 443/udp.
4. Point the domain's DNS A/AAAA record at the VPS **before** starting Caddy.
5. Copy the deployment files:
   ```bash
   sudo mkdir -p /opt/roomdesigner
   cd /opt/roomdesigner
   # copy docker-compose.prod.yml and the deploy/ directory here
   cp deploy/.env.production.example .env.production
   chmod 600 .env.production
   ```
   Fill in `DOMAIN`, `APP_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`,
   `DATABASE_URL`, Cloudinary, AI and email values.
6. Add GitHub repository secrets:

| Secret | Used by | Required |
|---|---|---|
| `NEON_DIRECT_DATABASE_URL` | migration step | yes |
| `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` | VPS deploy | yes |
| `VPS_PORT` | VPS deploy (default 22) | no |
| `VPS_APP_DIR` | VPS deploy (default `/opt/roomdesigner`) | no |
| `PRODUCTION_URL` | post-deploy smoke test (`https://<DOMAIN>`) | recommended |
| `VPS_GHCR_TOKEN` | long-lived read-only GHCR pull token for manual rollbacks | recommended |

Optionally set repository variables `WEB_PLATFORM` / `WORKER_PLATFORM`
(default `linux/amd64`) if the VPS is ARM64.

## CI/CD

`.github/workflows/ci.yml` runs on every push and pull request:

1. Install with a frozen lockfile, `prisma validate`, `prisma generate`,
   `prisma migrate deploy` against the CI Postgres service.
2. Typecheck, lint, unit/integration tests.
3. Start MinIO for upload/render tests, run Playwright (fake provider), then
   run a production build.
4. Build both Docker images (web + worker) to catch Dockerfile regressions.

`.github/workflows/deploy.yml` runs only after CI succeeds for a **push** to
`main`/`master` (or via manual `workflow_dispatch`):

1. Build and push `roomdesigner-web` and `roomdesigner-worker` to GHCR.
2. Run `prisma migrate deploy` against `NEON_DIRECT_DATABASE_URL`.
3. SSH to the VPS, pull the exact git SHA and run
   `docker compose up -d --wait` for `web`, `worker` and `caddy`.
   The web healthcheck (`/api/health`) gates the deploy.
4. Optionally poll `PRODUCTION_URL/api/health` after the stack is healthy.

Deploys use the `production` GitHub Environment. Add required reviewers there
if production releases need manual approval. Migrations run before the new
version starts; keep them additive for rollback safety.

## Manual deploy

```bash
cd /opt/roomdesigner
export GHCR_OWNER=<your-github-owner>
export IMAGE_TAG=<git-sha>
docker compose --env-file .env.production -f docker-compose.prod.yml pull web worker
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans --wait --wait-timeout 180 web worker caddy

# Migrations (manual)
docker compose --env-file .env.production -f docker-compose.prod.yml --profile tools run --rm migrate
```

## Rollback

- **Web + worker**:
  ```bash
  cd /opt/roomdesigner
  IMAGE_TAG=<previous-sha> GHCR_OWNER=<owner> ./deploy/rollback.sh
  ```
- **Database**: migrations must be backward compatible. Restore from Neon PITR
  only for destructive failures; record the incident in `DECISIONS.md`.

## Web and Caddy operations

- Web logs: `docker compose --env-file .env.production -f docker-compose.prod.yml logs -f web`.
- Web health: `GET http://127.0.0.1:3000/api/health` inside the container.
- Caddy logs: `docker compose --env-file .env.production -f docker-compose.prod.yml logs -f caddy`.
- Caddy auto-renews TLS certificates. Its state lives in the `caddy-data`
  volume; do not delete it unless you intentionally want new certificates.
- After changing `deploy/Caddyfile`, reload with:
  ```bash
  docker compose --env-file .env.production -f docker-compose.prod.yml exec caddy caddy reload --config /etc/caddy/Caddyfile
  ```
- Verify `https://<DOMAIN>/api/health` returns `{"ok":true}` after every deploy.

## Worker operations

- Logs: structured JSON on stdout (`channel: "worker"`); `docker compose logs -f worker`.
- Health: `GET http://127.0.0.1:3002/health` inside the container.
- Restart policy: `unless-stopped`; graceful shutdown on SIGTERM, with a 40s
  forced-exit ceiling under Docker's 45s grace period.
- Stuck jobs: the sweeper fails + refunds `RUNNING` jobs older than 10 minutes.
- Failed jobs: inspect `RenderJob` with status `FAILED`; refunds are idempotent.
- The worker needs `DATABASE_URL`, `BETTER_AUTH_SECRET`, `APP_URL`, storage and
  AI env because `getServerEnv()` validates the full server schema at boot.
- Containers run as non-root with a read-only filesystem, all capabilities
  dropped and `no-new-privileges`. Temp files use tmpfs.

## Backups and restore drill

1. Enable Neon automated daily backups and point-in-time recovery.
2. Create a scratch database from a backup/branch.
3. Point a staging worker/web stack at it (`DATABASE_URL`).
4. Run the smoke flow (OTP sign-in → project → fake render) against staging.
5. Record the date, time taken and any manual steps here.

## Secret rotation

- Generate a new `BETTER_AUTH_SECRET` with `openssl rand -base64 48`; update
  `/opt/roomdesigner/.env.production` and redeploy web + worker. Existing
  sessions will be invalidated.
- Rotate OpenAI, Cloudinary and Resend keys in the provider console first, then
  update `.env.production` and redeploy. Revoke the old key after the smoke test.
- Never commit `.env`, `.env.production`, deploy keys or provider keys.

## Credit adjustments

Insert an `ADJUSTMENT` ledger row with a note; balance is `SUM(delta)` and the
ledger is append-only.
