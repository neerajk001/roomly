# DECISIONS.md

Format: date, decision, reason.

## 2026-10-28 — Repo location
- Use the existing `roomly/` folder as the repo root instead of creating a new `room-designer/` repo.
- Reason: spec files already live here; renaming to `room-designer` is covered by decision gate G1 later.

## 2026-10-28 — Spec placement
- Copy `room-designer-spec/room-designer-spec/*` to `docs/spec/` and root `AGENT.md` to `AGENTS.md`, per `docs/spec/README.md` instructions.

## 2026-10-28 — Version pins (V1.1)
- TypeScript `5.9.3` instead of `latest`. Reason: `latest` is now TypeScript 7 (native rewrite); the ESLint/typescript-eslint and Prisma toolchains were not verified against it, so the proven 5.x line is used.
- Prisma pinned to `7.10.1` (exact). Reason: npm `latest` currently points at the Prisma 8.0 release candidate, which the Prisma docs themselves do not recommend for production; Prisma 7 is the recommended stable line.
- Next.js `16.4.3` with React 19.3, Tailwind CSS `4.3.3`, Better Auth `1.7.14`.
- Zod `4.6.7` (zod v4 API).

## 2026-10-28 — Better Auth setup differences from spec snippets (V1.1)
- The Prisma adapter now ships as a separate package `@better-auth/prisma-adapter` (docs: better-auth.com/docs/adapters/prisma), used as `prismaAdapter(prisma, { provider: "postgresql" })`.
- The Better Auth CLI is invoked as `pnpm dlx auth@latest generate` (the `auth` npm package).

## 2026-10-28 — Prisma 7 client setup (V1.1)
- Prisma 7 requires the `prisma-client` generator with an explicit `output` path and a driver adapter (`@prisma/adapter-pg`) when instantiating the client. The spec's `prisma-client-js` snippet is outdated; following current docs.

## 2026-10-28 — Internal packages as source (V1.1)
- Workspace packages export their TypeScript source (`exports: "./src/*.ts"`) and are consumed directly (Next `transpilePackages`, tsx for the worker). No per-package dist builds.
- Reason: removes build orchestration overhead; Turbo `build` only applies to web (and later a bundled worker). Revisit bundling for the worker when it does real work in V2.

## 2026-10-28 — Local S3 replaced: Chainguard MinIO (V1.1)
- `minio/minio` and `minio/mc` were removed from Docker Hub and quay.io around Sept 2026 (MinIO Community Edition archived). docker-compose now uses `cgr.dev/chainguard/minio` (same binary and ports) and creates the bucket via an `amazon/aws-cli` init sidecar instead of `mc`.
- R2 remains the production target; the S3 client in `packages/storage` (V2) must work with both.

## 2026-10-28 — Root `.env` loading without a new dependency (V1.1)
- Next.js only reads `.env` from the app directory, but the spec keeps one `.env` at the repo root. `packages/config/env.ts` walks up from `process.cwd()` (max 4 levels) and loads the first `.env` with Node's built-in `process.loadEnvFile` before validating. No `dotenv` dependency added. Existing variables are never overridden; in production the platform provides env vars directly.

## 2026-10-28 — Dev Postgres port moved to 5434 (V1.2)
- A native PostgreSQL install on this machine also listens on 5432 (Windows allows both to bind), so connections randomly hit the wrong server and failed auth. docker-compose publishes dev Postgres on 5434 (5433 is another local project); `.env.example` updated. CI keeps its own 5432 container.
- Better Auth CLI (`auth generate`) **replaces** `prisma/schema.prisma` with only its own tables. Workflow: keep app models in the file, run the CLI, then re-merge app models + `User` back-relations (`ownedWorkspaces`, `workspaceMemberships`). `mode` was added via `additionalFields` and appears in the generated `User`.

## 2026-10-28 — Prisma 7 config, env and client wiring (V1.2)
- `packages/db/prisma.config.ts` loads the repo-root `.env` with `process.loadEnvFile` (no `dotenv` dependency) and supplies `datasource.url`; Prisma 7 rejects `url` in the schema datasource block. `migrations.seed` points at `tsx prisma/seed.ts`.
- The db client singleton calls `loadRootEnvFile()` before reading `DATABASE_URL`, so scripts (seed, future worker jobs) work outside the Prisma CLI. The client is cached on `globalThis` for Next.js hot reload.

## 2026-10-28 — Resend without the SDK (V1.3 groundwork)
- `EmailSender` (console + Resend) lives in `packages/shared/src/email.ts`; Resend is called via `fetch` to `https://api.resend.com/emails` instead of adding the `resend` SDK (one HTTP call, no dependency). Dev uses the console implementation (`EMAIL_PROVIDER=console`).
- `packages/config` exports `./env` (not `.`), so imports are `@roomdesigner/config/env`.
- Better Auth imports: `better-auth`, adapter from `better-auth/adapters/prisma` (docs) with `@better-auth/prisma-adapter` installed as documented; `nextCookies()` is the last plugin. Google provider is only registered when both `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set, so email auth works in dev without OAuth credentials.
- Generated Prisma client stays gitignored; CI runs `prisma validate` then `pnpm db:generate` before typecheck/build.

## 2026-10-28 — Auth wiring and Next/Turbopack import rules (V1.3)
- Relay import style: relative imports inside workspace packages are **extensionless** (`"./workspace"`), not `"./workspace.js"`. TypeScript resolves both, but Turbopack does not map `.js` → `.ts`, so `.js` specifiers broke `next build`. Generated Prisma files (`.ts` specifiers) are left as Prisma emits them.
- Added `User.onboardedAt DateTime?` (also a Better Auth `additionalFields` entry, `input: false`) beyond the spec's allowed manual edits. Reason: "signed-in users without onboarding are sent to `/onboarding`" is not distinguishable from the `mode` default alone. Deviation from `02-database.md`, logged here.
- Local `.env` now uses `APP_URL`/`BETTER_AUTH_URL = http://localhost:3001` because port 3000 is occupied on this machine by an unrelated process. `.env.example` keeps 3000.
- Reset-password links are path-based (`/api/auth/reset-password/<token>?callbackURL=…`) and redirect to `/reset-password?token=…`; the page reads the query token. Verified the whole loop (sign-up → console verification email → verify → auto sign-in → guards, password reset → sign-in) against the running dev server.

## 2026-10-28 — shadcn/ui, shared barrel and onboarding (V1.4)
- shadcn CLI v4 (`--base radix --preset nova`) generated `components.json`, `src/lib/utils.ts`, tokenised `globals.css` and the `button/input/label/card/select/separator` components. It adds `class-variance-authority`, `radix-ui`, `lucide-react`, `tw-animate-css`, `cn` and **`shadcn` itself as a runtime dependency** because `globals.css` imports `shadcn/tailwind.css`. Recorded here since these are not in `01-architecture.md`'s dependency list (the stack only names shadcn/ui).
- `@roomdesigner/shared`'s barrel must stay client-safe. The email sender moved to the `@roomdesigner/shared/email` subpath: re-exporting it from `.` dragged `node:fs` (via env loading) into client chunks and Turbopack dev failed with "chunking context does not support external modules (node:fs)".
- Settings "mode" also flips `Workspace.type` between PERSONAL and STUDIO so the Pro shells stay consistent. Mode never deletes data.
- Marketing copy is a placeholder pending decision gate G1 (product name).

## 2026-10-28 — Test stack (V1.5)
- Vitest 5 in every workspace package (`test: vitest run`, `passWithNoTests` for still-empty packages). Playwright at the repo root (`tests/e2e`), Chromium only.
- Integration/unit tests use the **real local Postgres** from docker-compose (no testcontainers dependency); they create uniquely named users/workspaces and clean up. CI runs the same tests against a `postgres:16` service after `prisma migrate deploy`.
- Playwright starts its own Next dev server on port 3100 with `AUTH_REQUIRE_EMAIL_VERIFICATION=false`; Next 16 refuses two dev servers for the same project, so a running `pnpm dev` must be stopped before `pnpm test:e2e` locally.
- CI gained: Postgres service, migrate deploy, `playwright install --with-deps chromium`, E2E step. Untested on GitHub until a remote exists.

## 2026-10-28 — Upload/storage design (V2.1)
- Storage keys are built from the DB asset id: the Asset row is inserted first with a unique
  `pending/<uuid>` key, then updated to `ws/{workspaceId}/{kind}/{assetId}.{ext}` before presigning.
- Presigned PUTs bind `ContentLength` (and `Content-Type`) to the requested size, so a mismatched
  upload is rejected by S3/MinIO before it can be confirmed.
- `packages/storage` does not import Prisma (dependency rule): it exports its own
  `StorageAssetKind` union kept in sync with the Prisma enum.
- Uploaded files are re-encoded with sharp (`.rotate()` + re-encode drops EXIF/GPS), stored back
  under the same key; a JPEG thumbnail (≤512 px) is stored as a separate `THUMBNAIL` asset.
- `sharp`, `@prisma/client`, `@prisma/adapter-pg` added to `serverExternalPackages`.
- Verified live: presign → PUT → confirm returns 800×600; stored object has no EXIF/GPS; >10 MB
  rejected at presign; corrupt upload rejected at confirm.
- Better Auth requires an `Origin` header on POST requests (`MISSING_OR_NULL_ORIGIN` otherwise):
  browser calls are fine, but scripts/tests must send it.

## 2026-10-28 — AI/worker/credits design (V2.3–V2.4)
- Provider: OpenAI SDK 7.45 `images.edit` with `gpt-image-2.5-sunburst` (default) or `-flare`;
  pricing table in `packages/ai/src/pricing.ts` (2026-10-28 rates: $8/M image input tokens,
  $30/M image output tokens, $5/M text input tokens) with a conservative per-image fallback when
  usage is absent. Spending is computed from response `usage` when present.
- Moderation is **not** run before queueing (the web app must not call providers); a moderation
  rejection surfaces as a permanent provider error → FAILED + refund.
- Credit ledger helpers (`getBalance`, `reserveCredits`, `refundCredits`) live in `packages/db`
  because both the web service and the worker need them; authorization/validation stays in the web
  service layer. Reserve locks the `Workspace` row (`SELECT … FOR UPDATE`) then inserts the
  negative ledger row; refund uses `createMany({ skipDuplicates })` for idempotency.
- Queue options are shared (`RENDER_QUEUE_OPTIONS`, retryLimit 2, exponential backoff) and both apps
  call `createQueue` with them. `send` uses `singletonKey = jobId`.
- Transient vs permanent errors: `ProviderError.errorClass`; transient errors rethrow inside the
  pg-boss handler (retried), the final attempt is finalised in the handler (FAILED + refund) so no
  job can stay RUNNING forever.
- `RenderOutput.thumbAssetId` (+ `Asset.thumbFor`) added beyond the spec schema: the render grid
  needs a per-output thumbnail and the spec model had no link. Recorded deviation.
- Worker tests call `processRenderJob(deps, …)` with injected storage/provider instead of pg-boss;
  the pg-boss wrapper stays thin.
- Local dev: `SIGNUP_FREE_CREDITS` raised in the local `.env` only (default stays 3 per spec);
  4-variation draft renders cost 4 credits, so 3 free credits cannot fund one render.
- Live check: fake provider job QUEUED→SUCCEEDED in ~7 s (pg-boss poll + 4×sharp web/thumb),
  4 outputs, charge 4 credits; status API, favorite PATCH and download redirect all verified.

---

# V2 — Core Engine plan

Goal: project/room CRUD, photo upload with EXIF-stripping + thumbnails, fake/openai render
pipeline (QUEUED→RUNNING→SUCCEEDED/FAILED), credit reserve/refund, spend guard, render UI with
favorites/download/chat-edit, fidelity script, tests.

## Order of tasks
1. **Storage**: S3 client (AWS SDK v3), presign/head/get/put/delete; sharp pipeline (validate,
   re-encode, thumbnail); upload presign + confirm route handlers; unconfirmed-asset cleanup job
   (lands with the worker in task 3).
2. **Projects/rooms**: services (`(db, ctx, input)`), project grid pages for `/app` and `/studio`,
   room form (mm storage, unit toggle, openings), photo upload component (1–3 photos).
3. **AI + worker**: `packages/ai` (ImageProvider, fake, openai, pricing, prompts), `shared` styles +
   credit costs; worker with pg-boss, `render.generate`, post-processing, cost recording, retries.
4. **Credits**: `getBalance`, reserve/refund helpers, `createRender` (verified email, ownership,
   spend guard), balance in header, `/api/renders/:id` status handler.
5. **Render UI**: generate panel, polling, result grid, favorite/download, chat edit, disclaimers.
6. **Fidelity script** (`pnpm ai:fidelity`): gated by `IMAGE_PROVIDER=openai` + `--budget-usd`; stops
   at budget; report to human and **stop for G2** (needs a real API key, cannot run without one).
7. **Tests**: isolation (projects/rooms/assets/jobs/credits), credits concurrency + idempotent
   refund, worker retry/permanent failure with the fake provider, spend guard, upload validation
   (type/size/corrupt/EXIF), Playwright full flow with the fake provider.

## V2 risks / open points
- pg-boss and OpenAI Images APIs change: verify current docs before implementing; record versions.
- Web enqueues jobs too: pg-boss is initialised in both apps (shared payload types live in
  `packages/shared`), no new package.
- Google OAuth and G2 (provider/model quality tiers) still need human input; fidelity run needs an API key.
- Worker needs real bundling for production (V6); V2 keeps `tsx` for dev and runs the worker via tsx.

---

# V1 — Foundation plan

Goal: user can sign up, verify email, pick Home/Pro, land on the right dashboard; CI green. No uploads/renders/billing.

## Order of tasks
1. **Tooling**: pnpm workspace + Turborepo; skeleton for `apps/web`, `apps/worker`, `packages/{config,db,auth,shared,estimate,ai,storage,pdf,billing}`; strict tsconfig, ESLint flat, Prettier; `.nvmrc`, `.gitignore`, `.editorconfig`; docker-compose (Postgres 16, MinIO, Mailpit); `.env.example` + zod env schema; GitHub Actions CI.
2. **Database**: Prisma schema from `02-database.md`; generate Better Auth tables via CLI and merge; add `User.mode` + back-relations; initial migration; seed script with `--demo` flag.
3. **Auth**: Better Auth server config (email+password with verification, Google, rate limits); `EmailSender` (console + resend); idempotent `bootstrapWorkspace` + signup credit grant; route handler + client; `requireSession` / `requireWorkspace` / `requireVerifiedEmail`; auth pages; route-group guards.
4. **Onboarding & shells**: mode selection wizard (PRO: studio name/currency/units → STUDIO workspace + default rate card stub); redirects HOME→`/app`, PRO→`/studio`; Tailwind + shadcn/ui tokens; app shells with empty states; `/settings`; marketing landing placeholder.
5. **Tests**: env schema unit tests; integration test for bootstrap idempotency (real Postgres); Playwright sign-up→onboarding→dashboard (both modes); tenant-isolation scaffold.

## Verification after every task
`pnpm typecheck && pnpm lint && pnpm test` → fix before moving on → conventional commit.

## V1 risks / open points
- Better Auth CLI generation must run before the schema merge (order matters in task 2/3).
- Google OAuth needs real credentials — local dev can proceed with email/password + `AUTH_REQUIRE_EMAIL_VERIFICATION=false` in test env.
- `bootstrapWorkspace` transaction must be race-safe (unique `(SIGNUP_GRANT, workspaceId)` ledger row handles double-grant).
- Node version: use current Node LTS pinned via `.nvmrc` + `engines`.

## V1 Definition of Done
All phase checkboxes ticked, CI green, README setup < 10 commands, this file lists every deviation, summary written for the human.
