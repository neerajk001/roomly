# RoomDesigner

AI room redesign for homeowners (Home mode) and design studios (Pro mode).
Working title — decision gate G1 may rename it.

The full product spec lives in [`docs/spec/`](docs/spec/README.md). The current
implementation covers **V1-V4** plus V6 production hardening: monorepo, database,
auth, onboarding, Home/Pro flows, worker, Docker and CI/CD.

## Deployment

Everything runs on a single Hostinger VPS:

- **TLS / reverse proxy**: host Nginx (Let's Encrypt) → web on `127.0.0.1:3000`
- **Web + API + worker**: Docker (`docker-compose.prod.yml`)
- **Images**: Cloudinary (private signed uploads/delivery); MinIO/S3 for local/CI
- **Database**: Neon Postgres (managed, with backups)
- **CI/CD**: GitHub Actions (`.github/workflows/ci.yml`, `deploy.yml`)

See [`docs/runbook.md`](docs/runbook.md) for the full setup, secrets, deploy,
rollback and restore procedures.

## Requirements

- Node.js 22 (see `.nvmrc`)
- pnpm 10
- Docker Desktop (local Postgres, S3-compatible storage, Mailpit)

## Local setup (6 commands)

```bash
cp .env.example .env       # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm install
docker compose up -d       # Postgres 16 on :5434, MinIO :9000/:9001, Mailpit :8025
pnpm db:migrate
pnpm db:generate
pnpm dev                   # web on http://localhost:3001 (3000 is often taken), worker alongside
```

Notes:

- The dev Postgres is published on **5434** because 5432/5433 are commonly
  occupied on dev machines. CI uses a normal 5432 service.
- `APP_URL` and `BETTER_AUTH_URL` in `.env` must match the port Next.js picks.
- `EMAIL_PROVIDER=console` prints verification and password-reset links to the
  dev server log (Mailpit is available for SMTP experiments).
- Seed a demo workspace (user `demo@roomdesigner.local`): `pnpm db:seed -- --demo`.

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm test   # unit + integration (needs Postgres)
pnpm test:e2e                              # Playwright, starts its own server on :3100
pnpm build
```

## Workspace layout

| Path | Purpose |
|---|---|
| `apps/web` | Next.js app (App Router, Tailwind 4, shadcn/ui) |
| `apps/worker` | Background worker placeholder (render jobs land in V2) |
| `packages/config` | zod env schema, tsconfig/ESLint base |
| `packages/db` | Prisma 7 schema, migrations, client, seed |
| `packages/auth` | Better Auth server/client, workspace bootstrap |
| `packages/shared` | Pure shared constants/schemas (client-safe barrel) |
| `packages/{estimate,ai,storage,pdf,billing}` | Skeletons for V2–V6 |

## Product rules that are easy to break

- Renders are **concept visuals** — never promise exact dimensions or binding prices from AI output.
- Every tenant query is scoped by `workspaceId`; never trust a client-sent workspace id.
- Money is integer minor units; lengths are integer millimetres; percentages are basis points.
- Tests never call paid APIs (`IMAGE_PROVIDER=fake`).
