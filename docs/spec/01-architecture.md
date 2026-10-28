# 01 — Architecture

## Stack (fixed)

| Concern | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Language | TypeScript (strict), current Node LTS |
| Web app | Next.js (App Router), React, Tailwind CSS, shadcn/ui |
| Auth | **Better Auth** (Prisma adapter) |
| Database | **PostgreSQL** |
| ORM | **Prisma** |
| Job queue | pg-boss (queue stored in the same Postgres; no Redis needed) |
| Object storage | S3-compatible (Cloudflare R2 recommended; MinIO locally) via AWS SDK v3 |
| Image processing | sharp |
| AI images | `ImageProvider` abstraction. Providers: `fake` (dev/tests), `openai` first. Others later |
| PDF | @react-pdf/renderer |
| Email | Resend (prod), console/Mailpit (dev) behind an `EmailSender` interface |
| Validation | zod |
| Tests | Vitest (unit/integration), Playwright (e2e) |
| Observability (V6) | Sentry, pino logs |
| Billing (V5) | Stripe or Paddle behind a `BillingProvider` interface (decision gate G4) |

Do not add other frameworks or major libraries without recording a reason in `DECISIONS.md`.

## Monorepo layout

```
room-designer/
├─ AGENTS.md
├─ DECISIONS.md
├─ docs/spec/                 # these files
├─ apps/
│  ├─ web/                    # Next.js: UI, server actions, route handlers, public pages
│  └─ worker/                 # Node process: render jobs, PDF jobs, cleanup jobs
├─ packages/
│  ├─ config/                 # tsconfig.base, eslint config, env schema (zod)
│  ├─ db/                     # prisma/schema.prisma, client singleton, seed
│  ├─ auth/                   # Better Auth server + client config
│  ├─ shared/                 # zod schemas, constants (styles, plans, credit costs), types
│  ├─ estimate/               # PURE estimate engine + tests (no IO)
│  ├─ ai/                     # ImageProvider, prompts, pricing table, fake + openai providers
│  ├─ storage/                # S3 client, presign helpers, sharp pipeline, watermark
│  ├─ pdf/                    # proposal PDF components (react-pdf)
│  └─ billing/                # BillingProvider interface + implementation (V5)
├─ docker-compose.yml         # postgres, minio, mailpit
├─ turbo.json
├─ pnpm-workspace.yaml
├─ .env.example
└─ package.json
```

### Dependency rules

- Apps may import packages. Packages NEVER import apps.
- `estimate` and `shared` have no IO and no database imports.
- Only server code imports `db`. Never import `db` or `auth` server config in client components.
- `ai` and `storage` know nothing about Prisma. The worker and services connect them.

## Runtime picture

```
Browser ──► apps/web (Next.js) ──► Postgres (Prisma)
   │             │                      ▲
   │             ├─ presigned URL ─► S3/R2
   │             └─ enqueue (pg-boss) ──┤
   │                                    ▼
   └── polls /api/renders/:id    apps/worker ──► ImageProvider ──► S3/R2
```

- The web app never calls the image provider directly. It reserves credits, creates a `RenderJob`, and enqueues it.
- The worker owns calls to the provider, image post-processing and refunds.
- Public pages (`/p/[token]`, `/brief/[token]`, `/share/[token]`) are route handlers/pages that look up by token only. They have no session.

## Environment variables

All parsed in `packages/config/env.ts` with zod. Server and client schemas are separate.

```
# core
APP_URL=http://localhost:3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/roomdesigner

# auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AUTH_REQUIRE_EMAIL_VERIFICATION=true   # false only in tests/dev

# storage
S3_ENDPOINT=http://localhost:9000
S3_REGION=auto
S3_BUCKET=roomdesigner
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=                    # optional CDN base for public assets

# ai
IMAGE_PROVIDER=fake                    # fake | openai
OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=                    # check current model id in provider docs
MAX_DAILY_SPEND_USD=5
SIGNUP_FREE_CREDITS=3

# email
EMAIL_PROVIDER=console                 # console | resend
RESEND_API_KEY=
EMAIL_FROM=

# billing (V5)
BILLING_PROVIDER=
BILLING_API_KEY=
BILLING_WEBHOOK_SECRET=

# observability (V6)
SENTRY_DSN=
```

## Root scripts

`pnpm dev` (web + worker), `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, `pnpm db:migrate`, `pnpm db:generate`, `pnpm db:seed`, `pnpm db:studio`.

## Local development

`docker compose up -d` starts Postgres 16, MinIO (with the bucket created by an init script) and Mailpit. `pnpm dev` then runs everything. A new developer must be able to go from clone to a running app with: copy `.env.example` → `.env`, `pnpm install`, `docker compose up -d`, `pnpm db:migrate`, `pnpm dev`.

## Key flows (text)

**Render:** UI → server action `createRender` → service checks session, workspace, email verified, daily spend guard → transaction: reserve credits + create job → enqueue → UI polls → worker generates, stores outputs, finalizes → UI shows outputs.

**Proposal approval:** designer sends proposal (immutable snapshot) → email with `/p/[token]` → client views (status VIEWED) → comments or approves (status APPROVED + chosen option) → designer notified.

**Brief link:** designer creates link → client opens `/brief/[token]`, uploads photos and answers questions → submission creates a draft project and room for the designer.
