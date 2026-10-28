# V1 — Foundation

**Goal:** a running monorepo where a user can sign up, verify email, choose Home or Pro, and land on the right empty dashboard. CI is green.

**Read first:** `AGENT.md`, `01-architecture.md`, `02-database.md`, `03-auth-and-workspaces.md`.

## 1. Repo and tooling

- [x] Initialize pnpm workspace and Turborepo (`pnpm-workspace.yaml`, `turbo.json`, root `package.json` scripts from `01-architecture.md`).
- [x] Create the package and app skeletons listed in `01-architecture.md` (empty but building): `apps/web`, `apps/worker`, `packages/{config,db,auth,shared,estimate,ai,storage,pdf,billing}`.
- [x] `packages/config`: `tsconfig.base.json` (strict), ESLint flat config, Prettier config. Every package extends them.
- [x] `.nvmrc`/`engines` set to the current Node LTS, `.editorconfig`, `.gitignore`.
- [x] `docker-compose.yml` with Postgres 16, MinIO (bucket auto-created), Mailpit.
- [x] `.env.example` with all vars from `01-architecture.md`. `packages/config/env.ts` parses them with zod (separate server and client schemas). The app fails fast with a readable error if invalid.
- [x] GitHub Actions workflow: install (cached), `prisma validate`, typecheck, lint, test, build.

> Note: the `prisma validate` CI step is added in task 2 together with the schema. Verified locally so far: `pnpm typecheck && pnpm lint && pnpm build` all pass, `docker compose up -d` brings up Postgres 16 + S3 + Mailpit with the bucket auto-created, and `pnpm dev` boots web and worker (env validation fails fast on a broken env).

**Acceptance:** from a clean clone, the steps in "Local development" of `01-architecture.md` produce a running app. CI passes on a PR.

## 2. Database

- [x] `packages/db`: add Prisma, schema from `02-database.md`, Prisma client singleton (safe for Next.js hot reload).
- [x] Generate the Better Auth models with the Better Auth CLI and merge into the schema. Add the `User` back-relations and the `mode` additional field.
- [x] Create the initial migration. `pnpm db:migrate` and `pnpm db:generate` work.
- [x] Seed script: creates nothing by default; `--demo` flag creates a demo workspace.

**Acceptance:** `prisma migrate reset` + migrate works on a clean DB; `prisma validate` passes.

> Note: dev Postgres is published on 5434 (5432 is held by a native PostgreSQL install on this machine, 5433 by another project). Verified: `prisma validate`, `migrate reset --force` + re-apply, seed (no-op and `--demo`, idempotent). `EmailSender` (console + Resend), `bootstrapWorkspace` and the Better Auth server config also landed here because the auth-table generation needs them; their verification is task 3/5.

## 3. Auth

- [x] `packages/auth`: Better Auth server config (Prisma adapter, email/password with verification, Google, `mode` field, rate limits on).
- [x] `EmailSender` interface in `packages/shared` with `console` and `resend` implementations. Dev uses Mailpit via SMTP or the console implementation.
- [x] `bootstrapWorkspace(user)` from `03-auth-and-workspaces.md`, wired through the Better Auth database hook. Idempotent. Grants `SIGNUP_FREE_CREDITS` once.
- [x] Next.js route `app/api/auth/[...all]/route.ts` and the auth client.
- [x] Helpers: `requireSession`, `requireWorkspace`, `requireVerifiedEmail`.
- [x] Pages: sign-in, sign-up, verify-email, forgot-password, reset-password. Include Google button. Clear error messages.
- [x] Route-group layouts with guards: `(marketing)`, `(auth)`, `(app)`, `(studio)`.

**Acceptance:** sign up with email → verification mail arrives → verify → signed in. Google sign-in works with real credentials. A new user has exactly one workspace and one `SIGNUP_GRANT` ledger row. Running bootstrap twice changes nothing.

## 4. Onboarding and shells

- [ ] `/onboarding`: choose mode; PRO also asks studio name, currency, units and converts the workspace to `STUDIO`.
- [ ] Redirects: HOME → `/app`, PRO → `/studio`. Signed-in users without onboarding are sent to `/onboarding`.
- [ ] Tailwind + shadcn/ui setup. Design tokens (colors, radius, fonts). Light theme first, dark-mode-ready variables.
- [ ] App shell for `/app` (top bar, "New project" empty state) and `/studio` (sidebar: Projects, Clients, Rate cards, Settings; empty states).
- [ ] `/settings`: change mode, currency, units, display name. Sign out.
- [ ] Marketing landing page: placeholder hero + CTA (final copy after decision gate G1).

**Acceptance:** both onboarding paths work on a 375px viewport and on desktop, with keyboard only.

## 5. Tests

- [ ] Vitest set up in each package; `turbo test` runs all.
- [ ] Unit: env schema (valid, missing, malformed).
- [ ] Integration (real Postgres via docker or testcontainers): `bootstrapWorkspace` idempotency and credit grant.
- [ ] Playwright: sign up (with `AUTH_REQUIRE_EMAIL_VERIFICATION=false` in the test env) → onboarding as Home → `/app`; and as Pro → `/studio`.
- [ ] Tenant-isolation test scaffold exists (can be minimal now).

## Definition of Done for V1

- [ ] All boxes above ticked.
- [ ] CI green on the main branch.
- [ ] `README.md` at repo root explains setup in under 10 commands.
- [ ] `DECISIONS.md` lists every deviation from the spec.
- [ ] Short summary written for the human: what works, what was skipped, open questions.

**Out of scope for V1:** uploads, renders, billing, proposals.
