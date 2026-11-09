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

## 2026-10-28 — V2 tests, E2E and G2 status (V2.7)
- Playwright's `globalSetup` starts the worker with `IMAGE_PROVIDER=fake` for the E2E run and stops it
  (`taskkill /T` on Windows). This avoids needing the worker in Playwright's webServer list.
- When `AUTH_REQUIRE_EMAIL_VERIFICATION=false` (dev/tests), the Better Auth `user.create.after` hook
  also marks the user's email as verified. Without that, sign-up works but every credit-spending
  action is blocked by `requireVerifiedEmail` — there is no email to click in tests.
- Renders are visible to the worker only if it runs: `pnpm dev` starts web + worker; `pnpm test:e2e`
  starts its own worker. Stop any manual dev server before E2E (Next refuses two dev servers for the
  same project directory).
- Test coverage added: prompts/pricing units, storage image pipeline (EXIF, corrupt, size, dimensions,
  derivatives), credits (balance, overspend, concurrent reserve, idempotent refund), worker
  (success/retry/final-transient/permanent failure), web tenant isolation + spend guard + unverified
  block, and the full Playwright render flow at 375 px.
- **G2 is not decided yet**: `pnpm ai:fidelity --budget-usd 3` requires `IMAGE_PROVIDER=openai`,
  `OPENAI_API_KEY` and five real photos in `fixtures/rooms/`. None of those are available, so the
  fidelity report and the provider/model/quality decision are deferred to the human.

## 2026-10-28 — Dev auth bypass + optional room measurements
- `DEV_AUTH_BYPASS=true` (local `.env` only; `.env.example` default `false`) makes `getSession()`
  return a synthetic session for a `dev@roomdesigner.local` user. The workspace is created via
  `bootstrapWorkspace` on first request and the user is marked onboarded. The flag is **ignored
  whenever `NODE_ENV === "production"`**, and Playwright's webServer explicitly sets it to `false`.
- The bypass replaces only the session lookup: services, tenant scoping, credit and verified-email
  rules still run unchanged.
- `Room.widthMm/lengthMm/heightMm` are now **nullable**. Homeowners usually don't know dimensions
  and AI renders never use them; dimensions only feed estimates. Room form labels them optional,
  the form no longer requires them, and displays show "Measurements not set". Estimate code in
  V3/V4 must handle null dimensions. Service-level validation still enforces range limits when a
  value is supplied.

## 2026-10-28 — Render quality tuning (pre-G2)
- Dev now runs `IMAGE_PROVIDER=openai` with `gpt-image-2.5-sunburst` (editing precision model) and
  **high** quality for both tiers; the tier only changes the output size (draft 1024×1024 or
  1024×1536 for portrait photos; final 1536×1024 / 1024×1536). UI defaults to Final.
- RESTYLE prompt extended beyond the 04-ai-pipeline template: fully furnished/move-in-ready,
  explicit removal of boxes/clutter, material and texture language, no people. Requested after
  comparing with a competitor's staging results; prompt snapshot tests updated.
- Web render JPEG quality raised to 91; thumbnails unchanged.
- Local dev credit balance topped up via an `ADJUSTMENT` ledger row so quality testing doesn't hit
  the 12-credit signup grant.

---

## 2026-10-28 — Style differentiation and variation diversity
- Bug: the RESTYLE prompt only received the style *label*, never the style `promptHint`, so Modern and
  Scandinavian converged on the same warm-neutral staging. The hint is now part of the prompt
  ("Style direction — … Interpret this style faithfully and distinctly").
- `n = 4` in one provider call returned four near-identical images. RESTYLE jobs now make one call
  per variation in parallel with a deterministic per-variation emphasis (calm/less clutter,
  layered decor, lighter palette, moodier accents). EDIT stays a single image. Cost is summed across
  calls; credits unchanged.
## 2026-10-28 — Hard structure lock for renders
- Product rule: the room architecture must never change (windows, doors, walls, floor layout/material,
  dimensions, camera). The RESTYLE prompt now embeds a STRICT STRUCTURAL CONSTRAINTS block and the
  EDIT prompt re-states it; variation emphases are limited to furniture/textiles/decor.
- `input_fidelity` is NOT supported by `gpt-image-2.5` (API returns 400 invalid_input_fidelity_model); it was removed after a failed render. Structure is enforced by the prompt only until G2 picks a model that supports it.
- Residual drift is a model limitation; the next lever (not built yet) is an automatic edge-map
  structure check that rejects/refunds outputs whose geometry diverges.
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
---

# V3 - Home Mode plan

Goal: guided homeowner/renter wizard, before/after results, rough cost range + shopping list, share link with votes, free-tier watermark.

G2 provisional (human-approved): gpt-image-2.5-sunburst, draft = low/1024, final = high/1536; revisit after the fidelity run when photos are available.

## Order of tasks
1. **Estimate engine** (pure): computeEstimate + recompute, exact rounding, golden test (87110 / 100612) and edge cases. Shared helpers: formatLength/formatArea, default-scope.ts, room-needs.ts, style palettes/tags, impact weights, default rate-card seed data.
2. **Guided wizard** /app/new: photo -> room (+typical-size helper) -> keep list -> renter mode -> optional budget -> style quiz -> confirm; state survives refresh; creates project, room, assets, render with keepList/renter/style and persists a rough estimate.
3. **Results & cost UI**: before/after slider (keyboard/touch), try another style, compare favorites, cost range panel with category toggles (client uses the same pure engine), what-to-change-first, shopping list + print.
4. **Share & free tier**: share token create/revoke, public /share/[token] gallery with votes (cookie + IP rate limit, noindex), watermark at delivery for free workspaces, getPlanState, "get more credits" stub.
5. **Polish & tests**: empty/loading/error states at 375 px, a11y pass, analytics events, unit + integration + share/watermark tests, Playwright wizard -> results -> estimate -> share -> vote.
## 2026-10-28 - V3 progress (Home mode core)
- Estimate engine is pure and integer-exact; golden test (87110 / 100612) and edge cases pass.
- `/app/new` wizard: photo(s), room + typical-size helper, keep-list chips, renter mode, budget, 6-pair style quiz (palette swatches; artwork pending) with tag-based recommendations, confirm. Draft survives refresh via localStorage (files cannot be persisted; noted in UI).
- Wizard creates project/room, seeds an illustrative default rate card per currency, persists a versioned Estimate, uploads photos and starts a 3-concept draft render.
- Room page now shows a cost range panel (client recomputes with the same pure engine when toggling categories), what-to-change-first ranking, and a shopping list (print-friendly).
- Before/after comparison slider added to the results section.
- Still open in V3: try-another-style and compare-favorites actions, checkable shopping list + copy, share links/votes, free-tier watermark/plan state, analytics events, and the V3 test suite/Playwright flow.
## 2026-10-28 - Share gallery, votes and free-tier delivery
- Project gained `shareShowFavorites` (favorited-only gallery vs all renders). Tokens are 192-bit
  base64url; updating settings keeps the token unless regenerate is requested; revoke clears it.
- `/share/[token]` is a public page (no session) that only reveals project name, one room and chosen
  renders; noindex + no-referrer headers added in next.config.
- Votes: one per image per browser via an httpOnly cookie (`share_votes_<token>`) plus an in-memory
  IP+token rate limit (single-process; move to Postgres in V6). Votes increment `RenderOutput.votes`.
- Free-tier watermark is applied at delivery by a new route `/api/render-outputs/[id]/file`
  (sharp overlay); stored originals and signed URLs stay clean. Paid workspaces redirect to signed
  URLs. Plan state is `getPlanState` (FREE until V5 subscriptions exist).
- Added a `/pricing` stub and a "get more credits" link on insufficient-credit errors.
---

# V4 - Pro Mode plan

Goal: designer workflow: studio profile, clients, brief links, own rate cards, editable estimates, proposals with PDF and public approval.

Provisional decisions: no new dependencies beyond the stack; logo uploads reuse the existing presign/confirm pipeline with kind=LOGO (added later in the phase); PDF via @react-pdf/renderer in a worker job; proposal immutability via version rows plus a freeze flag.

## Order of tasks
1. **Studio profile + clients**: workspace contact/terms fields, `/studio/settings`, client CRUD with search and soft delete, client detail page, attach client when creating a studio project.
2. **Brief links**: create link per client (expiry), public `/brief/[token]` (branded, honeypot, rate limits), token-scoped photo uploads, submission creates draft project/rooms/assets, email to designer.
3. **Rate cards**: default Pro card on first onboarding, list/editor (categories, units, markup/tax, multiple cards), CSV import/export with row errors and all-or-nothing apply, imperial display.
4. **Estimate builder**: auto-fill from room scope, editable lines with `recompute`, multi-room summary, version history, read-only when referenced by a sent proposal.
5. **Pro renders + proposals**: pin outputs with captions, proposal builder (text, options, estimate version, terms, expiry), PDF via worker, send freezes snapshot + token + email, status timeline.
6. **Client approval `/p/[token]`**: gallery, estimate accordion, approve/request changes with name, view tracking, emails, noindex + rate limits.
7. **Dashboard + tests**: pipeline columns, project tabs, isolation/CSV/state-machine/PDF tests, Playwright full workflow, summary.

---

# V3 - Home Mode plan
## 2026-10-28 - V4.3 studio profile and rate cards (partial)
- Workspace gained contactEmail, contactPhone and defaultTerms. `/studio/settings` edits studio name/brand colour/currency/units/contact/terms and uploads a logo through the normal presign/confirm pipeline with kind=LOGO (2 MB cap; SVG is rejected for now, record for V4 polish).
- Pro rate cards: a "Starter rates (edit me)" card is seeded on first visit using the illustrative defaults; editor supports name, markup/tax percent, per-item label/category/unit/price, add and remove with all-or-nothing validation. CSV import/export and imperial display are still pending.
## 2026-10-28 - V4.4 CSV and estimate builder
- Rate-card CSV: export route (`/api/rate-cards/[id]/export`), header `key,label,category,unit,price`, prices in major units; import is all-or-nothing (row-level errors reject the file), then replaces items via the same validated update path.
- Estimate builder (`/studio/.../rooms/:id/estimate`): auto-fills from the room scope + default rate card, editable lines recomputed client-side with `recompute`, markup/tax from the card, save creates a new versioned Estimate (history shown). Multi-room summary totals and read-only-after-send enforcement are still pending (they arrive with proposals).
## 2026-10-28 - V4.5 proposals and public approval
- Proposals: draft with title/intro/terms/expiry, pinned favorite renders (max 4) with `optionCaptions`, estimate version reference; send transitions DRAFT->SENT, sets sentAt, emails the client link when a client email exists. Public token is generated at creation (192-bit) and only exposed via the client link after send.
- `/p/[token]`: branded page, options gallery, estimate accordion, terms, comments; first view marks VIEWED + viewedAt; approve records approvedAt/outputId/name; request changes records a client comment and CHANGES_REQUESTED; expired proposals are rejected (EXPIRED). noindex/no-referrer headers + IP/token rate limit.
- PDF generation (worker + @react-pdf) and the designer pipeline dashboard are still pending; the client link works without a PDF.
## 2026-10-28 - V4.6 proposal PDF
- `packages/pdf` uses @react-pdf/renderer 4.9 (`renderToBuffer`) to build a text/estimate proposal PDF on demand from a server action; stored at `ws/{workspaceId}/pdf/{proposalId}.pdf` and linked on the public page. Deviation: generated in the web process rather than a worker job, and option thumbnails are not embedded yet.
## 2026-10-29 - V6.1 security and reliability basics
- Rate limiting moved from in-memory to a Postgres fixed-window table (`RateLimit`); one async `checkRateLimit(key, limit, windowMs)` interface used by brief uploads/submissions, share votes and proposal actions. Expired buckets are pruned by the worker.
- Stuck job recovery: a scheduled worker job (every 10 min) fails and refunds `RUNNING` jobs older than 10 minutes (STUCK error).
- `/api/health` uptime probe (DB round-trip, no-store).
- Global security headers: nosniff, DENY framing, Permissions-Policy (camera self only), HSTS, and a CSP limited to frame-ancestors/object-src/base-uri (full script CSP pending a nonce strategy).
- G3 hosting decision is still open; no deployment files were written.
## 2026-10-29 - G3 hosting decision
- Human chose: **web on Vercel + worker on a VPS + managed Postgres with backups**. Added a worker
  Dockerfile (multi-stage, non-root), `.dockerignore`, `docs/runbook.md` (env matrix, deploy,
  rollback, restore drill, worker ops) and `docs/security-audit.md` (action/route auth table).
- No vercel.json is needed; the Vercel project should use the repo root with the filtered build
  command documented in the runbook.
## 2026-10-29 - V6.3 logging, legal and data controls
- Added a pino logger (`@roomdesigner/shared/logger`) with PII/token/URL redaction; unhandled server errors now log structurally. Worker still writes JSON lines and can switch to the same logger.
- Legal drafts under `/legal/terms|privacy|cookies|refunds` (pending professional review) linked from the marketing footer, plus support contact and the AI disclaimer.
- Data controls in Settings: JSON export of workspace/clients/projects/rooms/estimates/proposals (`/api/account/export`) and a typed-DELETE account deletion that cascades tenant data (storage objects for deleted assets are left for the cleanup job; noted).
## 2026-11-02 - All app tiers on the Hostinger VPS
- Supersedes the earlier "Vercel web + VPS worker" split: the human decided the
  frontend and backend both run entirely on the Hostinger VPS.
- Added `apps/web/Dockerfile` (production Next.js image), a `web` compose service
  and Caddy for automatic HTTPS in front of it. Removed `apps/web/vercel.json`
  and every Vercel deploy/env instruction.
- The deploy workflow now builds and pushes both `roomdesigner-web` and
  `roomdesigner-worker`, applies migrations, then runs `docker compose up -d
  --wait` for web, worker and Caddy. The web healthcheck gates the release.
- Caddy needs ports 80/443 open and `DOMAIN` in `.env.production`; the domain's
  DNS A/AAAA record must point at the VPS. Neon and Cloudinary remain managed
  external services.

## 2026-11-02 - Cloudinary image storage
- Added `STORAGE_PROVIDER=s3|cloudinary`. `s3` stays the default for local dev and
  CI (MinIO), while production uses `cloudinary`. Reason: CI and tests must never
  require remote credentials or a paid provider.
- Added `cloudinary@2.11.0` to `packages/storage`. This dependency is not in
  `01-architecture.md`; it is recorded here per the dependency rule. The SDK is
  used for signed direct uploads, private delivery URLs and the Admin API.
- Browser uploads now return an `UploadTarget` (presigned `PUT` for S3, signed
  multipart `POST` for Cloudinary) from `@roomdesigner/shared`. One client helper
  handles both, so upload components do not know which provider is active.
- Cloudinary assets are uploaded with `type=private`; `presignGet` uses
  `private_download_url` with `expires_at`, keeping the existing ≤1 hour URL
  behaviour. Images and PDFs use `resource_type=image`; unknown extensions fall
  back to `raw` (raw public IDs keep the extension, per Cloudinary docs).
- Upload confirmation still verifies size via the storage provider and re-encodes
  through sharp before re-upload, so EXIF/GPS stripping and thumbnail generation
  are unchanged.
- Proposal PDFs stored in Cloudinary require PDF delivery to be enabled in the
  Cloudinary security settings; documented in `docs/runbook.md`.

## 2026-11-02 - Production deployment: Vercel web + Hostinger VPS worker
- Superseded later the same day: the web tier now runs on the VPS too (see the
  "All app tiers on the Hostinger VPS" entry).
- Hosting split (G3): Next.js UI, server actions and API routes run on **Vercel**;
  the pg-boss worker and one-off migrations run in Docker on the **Hostinger VPS**;
  Neon remains the managed Postgres. No web Dockerfile is maintained because the
  web tier is Vercel-managed. Recorded because the V6 text says "Dockerfiles for
  web and worker".
- Worker image is a multi-stage build with a non-root user, `tini`, a pinned
  Node 22 Alpine base and a Docker `HEALTHCHECK`. The final image keeps the full
  workspace install (tsx, Prisma CLI, sharp) so the same image can run both the
  worker and the migration profile; pruning was rejected as too fragile for a
  single long-lived container.
- Added a worker HTTP health probe (`GET /health`, default port 3002,
  `WORKER_HEALTH_PORT=0` disables it). It performs a `SELECT 1` DB round-trip so
  Docker/uptime checks fail when the database connection is lost.
- `docker-compose.prod.yml` now runs the worker read-only, drops all capabilities,
  sets `no-new-privileges`, uses a tmpfs for `/tmp`, has memory/CPU limits,
  graceful stop, log rotation and health-gated deploys (`up --wait`).
- CI starts MinIO with the repo's compose file before Playwright (uploads/renders
  need S3 in CI), and builds the worker image on every run to catch Dockerfile
  regressions. Deploy only runs for successful **push** CI runs on
  `main`/`master`, uses the `production` GitHub Environment (supports required
  reviewers), and smoke-tests `PRODUCTION_URL/api/health` after the Vercel hook.
- Vercel build settings are pinned in `apps/web/vercel.json` (root directory
  `apps/web`, full workspace install, filtered build). The Vercel project must
  still enable "Include source files outside of the Root Directory".
- Neon URL split: Vercel uses the pooled `DATABASE_URL`; the worker and migration
  job use the direct URL (`NEON_DIRECT_DATABASE_URL` in CI). pg-boss keeps
  long-lived connections and should not go through the transaction pooler, so
  added optional `QUEUE_DATABASE_URL` (used by both web and worker queue clients)
  that falls back to `DATABASE_URL`. Set it to the direct Neon URL on Vercel.
- Added `deploy/vps-bootstrap.sh` (Docker, UFW SSH-only, fail2ban, unattended
  updates) and `deploy/rollback-worker.sh` (pin a previous image tag and wait for
  health) for repeatable VPS operations.

## 2026-10-29 - Marketing landing page interactive overhaul
- Redesigned landing page to faithfully match the user-provided design reference:
  - Hero interactive Before/After comparison slider with `< | >` drag handle, Before/After badges, and scroll-driven glide effect.
  - Style selector buttons under hero (Modern, Minimal, Boho, Classic) dynamically switching the AI render style.
  - 4-item capability strip, social proof, and press logo strip.
  - "See what's possible" gallery with category filter chips (All, Living Room, Bedroom, Kitchen, Bathroom, Home Office) and interactive before/after sliders on every card.
  - Testimonial cards with ratings and avatars; 4-step guided process flow.
  - Dedicated Homeowner vs Professional feature spotlight cards with illustrated visual callouts.
  - Interactive Pricing section with Monthly/Yearly toggle (with 20% discount calculation).
  - 2-column expandable FAQ accordion and high-contrast dark green bottom CTA banner with quick email input.


## 2026-11-05 - Host Nginx instead of bundled Caddy
- The VPS already runs host Nginx on 80/443 with a Let's Encrypt cert for
  \oomly.neerajx.site\. To avoid a port conflict, the compose stack no longer
  runs the Caddy container; \web\ is published on \127.0.0.1:3000\ and Nginx
  reverse-proxies to it. The deploy workflow now pulls/starts only \web\ and
  \worker\. \deploy/Caddyfile\ is retained for reference but unused.
- Nginx is responsible for HTTP->HTTPS redirect and TLS renewal.

## 2026-11-05 - Health endpoint reports the deployed git commit
- \GET /api/health\ now returns \db\, \dbLatencyMs\ and \uild\ (plus an \x-build-sha\`n  header). \BUILD_SHA\ is an image build METADATA env (set via \ENV BUILD_SHA=\\`n  in apps/web/Dockerfile), not a deploy-time config variable, so it is intentionally
  not in the zod env schema/.env.example/turbo globalEnv � deviation from the env-var
  rule noted here. Local/dev builds report \uild: 'unknown'\.
# 2026-11-07 — Restore the two UX journeys
- Human prioritized repairing existing UX before more phase work.
- One corrective task spans existing Home and Pro screens.
- Home journey: photo, concepts, cost range, shopping list, share.
- Studio journey: client, brief, rooms, concepts, estimate, proposal.
- Make both experiences reachable in persistent navigation.
- Mode remains a preference, not an authorization restriction.
- Replace misleading Save draft navigation with New design.
- Correct Studio active states on desktop and mobile.
- Expose account settings from both experiences.
- Restore the full Home cost breakdown and shopping links.
- Expose Pro concept and estimate actions at project level.
- Separate onboarding selection from submission; show errors.
- Add regression tests for both journeys and navigation.
- Run typecheck, lint and tests before committing.
- Normalize pre-existing invalid UTF-8 in this log for editing.
- No new dependencies or product decision gates are introduced.
- Delivered: persistent Homeowner/Interior designer links, responsive Studio navigation,
  dashboard workflow guides, explicit onboarding confirmation with visible errors,
  project workflow shortcuts, restored Home cost controls and photo management.
- Corrected the itemized-cost link and removed the Home illustrative estimate panel
  from Pro rooms; designers use the existing editable rate-card estimate instead.
- Existing phase boxes remain unchanged: this corrective task does not complete
  the outstanding V4 feature or acceptance-test requirements.
- Verification: pnpm typecheck, pnpm lint and pnpm test all passed, including
  three new experience-navigation regression tests.
- Browser E2E attempt was blocked by the user's existing Next dev server on port 3001;
  the runner cannot launch a second server for the same checkout on port 3100.
# 2026-11-08 — Reference theme across existing screens
- Human approved the pale blue-gray, warm-white, orange and charcoal theme.
- Apply this as a single visual corrective task across existing phases.
- Preserve every component, route, control, interaction and feature.
- Add no new product components, dependencies, plans or marketing claims.
- Centralize the approved palette and surface tokens in globals.css.
- Replace existing blue/yellow Home and cream/green Studio styling.
- Keep semantic success, warning and error colors distinct.
- Preserve provider logos and user-selected studio branding.
- Use Geist consistently, including headings previously styled as serif.
- Replace hard offset shadows with restrained elevation.
- Standardize rounded controls, thin borders and focus visibility.
- Increase section spacing and surface padding without hiding content.
- Apply the same styling to marketing, auth, onboarding and both app modes.
- Include public briefs, sharing, approval, settings and render results.
- Verify route/component preservation, responsive screenshots and checks.
- Do not tick unrelated unfinished product-phase acceptance boxes.
- The primary orange is slightly darker (#B95308) than the reference-derived
  #C65D0A so white labels on small action buttons have stronger contrast.
- Delivered shared colors, rounded surfaces, quieter shadows and consistent
  typography across existing screens; Home and Studio share deep-teal navigation.
- Desktop (1440px) and mobile (375px) landing/sign-in screenshots verified;
  corrected the mobile header and hero sizing without hiding controls.
- TypeScript JSX audit confirms identical ordered component/element tags in all
  46 changed TSX files: no components were introduced or removed.
- Authenticated screens were restyled in source; their browser walkthrough is
  not covered by the public-page screenshots.
- Verification passed: pnpm typecheck, pnpm lint and pnpm test (all 11 packages).
- Existing route/component structure, user copy and event handlers are retained;
  only visual classes, theme variables and responsive sizing were changed.
# 2026-11-08 — Core completion implementation plan (billing excluded)
- Human approved starting the six-batch core-feature repair plan.
- Preserve the current theme and existing Home/Studio navigation.
- Work within V4 and repair shared earlier-phase behavior as needed.
- Batch 1: usable brief photos, complete render history, safe proposal states.
- Include duplicate brief submission protection and regression tests.
- Batch 2: shared estimate calculations, exact input parsing, safe version saves.
- Batch 3: editable rooms, accessible older work and recoverable operations.
- Batch 4: rate-card grouping/order/units and saved/project estimates.
- Batch 5: proposal editing/revisions, preview/PDF, client review/notifications.
- Batch 6: both end-to-end journeys and isolation/regression verification.
- Verify each batch with typecheck, lint and tests; commit separately.
- Use fake providers in automated checks and never invoke paid generation.
- Consult installed Next.js guides and official Prisma/API docs before changes.
- Do not invent pricing, billing, hosting or other product gate decisions.
- Only mark existing phase boxes complete when their full acceptance is met.
- Stop for human review at V4 completion; report any external-test blockers.
- Batch 1 complete: brief uploads work as source photos across project/room,
  dashboards and sharing; full render history is loaded chronologically.
- Public drafts/deleted projects are hidden; client actions require an open,
  unexpired proposal and a name. Conditional transactional updates protect
  approval/change requests and first-view tracking from concurrent overwrites.
- Concurrent brief submissions create only one project. Six new regression
  cases pass; typecheck, lint and tests pass across all 11 packages.
- Batch 2 complete: Pro drafts use computeEstimate including opening deductions;
  missing dimensions show guidance rather than zero-price estimates. Decimal money
  and percentages are parsed exactly; malformed CSV prices are rejected.
- Estimate versions serialize per room without mutating older versions; saved
  totals are bounded to the existing integer database fields. Seven new tests
  cover exact parsing, deductions, missing sizes, version races and isolation.
- Batch 2 typecheck, lint and tests pass across all 11 packages.
- Batch 3 complete: room editing with visible validation and notices; scoped
  photo removal detaches sources while preserving existing concept history.
- Upload progress no longer double-counts confirmed files. Failed favorite
  writes roll back visibly; projects and saved concepts have page navigation.
- Remote DB latency caused 10-second setup-hook timeouts in unchanged suites.
  Web integration files now run serially with a 30-second hook allowance;
  all 41 web tests and all package typecheck/lint/test tasks then passed.
- Saved concepts currently filter the full scoped metadata set before paging
  to preserve style-label searching; SQL search optimization is deferred.
- Batch 4 complete: grouped/reorderable responsive rate cards, create/default
  controls, imperial prices/quantities with exact metric values retained when
  untouched, and strict all-or-nothing CSV parsing (duplicate keys rejected).
- Saved estimate versions open read-only and can be copied to a new version.
  Exact/range presentation persists; project totals use the latest room versions
  and keep different currencies separate. Starter-card creation is race-safe.
- Unit, CSV and integration regressions pass; typecheck/lint/tests pass across
  all 11 packages. Six completed V4 checklist items are now ticked.
- Batch 5 uses an additive proposal snapshot and durable email-outbox migration.
  Existing proposals are retained; legacy sent proposals without snapshots keep
  their previous behavior. New sends freeze names, branding, prices and image keys.
- Revisions link back to their source. Replacing an old public link is opt-in;
  approved proposals remain available as their original approval records.
- Email events are written with state changes and retried by the existing worker.
  Resend's documented Idempotency-Key protects duplicates within 24 hours.
- Batch 5 complete: editable drafts with stale-write protection, opt-in revision
  links, frozen sent content, pin/order controls and public before/after review.
- PDF preview and download share one renderer with branding, images and totals.
  Generation remains on-demand in the web app as the previously recorded deviation;
  email delivery uses the worker. Both PDF fixture pages were visually inspected.
- Typecheck, lint and all 11 package test tasks pass (49 web tests, 8 worker tests).
- Batch 6 adds keyboard-accessible Studio project tabs with project-wide concepts
  and proposal activity. Home keeps its sharing workflow and room creation remains
  visible. New rooms respect workspace measurement units.
- Added Pro tenant read/write isolation coverage and an explicit client approval
  confirmation. Proposal snapshots and PDFs now retain optional estimate ranges.
- Browser tests use a separate .next-e2e build directory, fake images and console
  email, avoiding collisions with normal development. Next.js generated its matching
  TypeScript includes; ESLint ignores this additional generated directory.
- E2E accounts are recorded in an exact-email manifest; teardown removes only
  those accounts, their owned workspaces and associated storage objects.
- Human real-provider fidelity approval (G2) and the unassisted 20-minute timing
  exercise remain acceptance gates; billing and production launch are excluded.
- Final review found that shared display formatting rounded cents away and the
  Pro editors/CSV assumed two decimal currency units for JPY. Formatting now keeps
  cents, while whole-yen editing/import/export and PDF output use JPY minor units.
  Added money, CSV and PDF regressions for these supported-currency cases.
- The stronger chat completion check exposed a missing Home history control:
  old jobs were loaded but could not be reopened. Added a compact labelled history
  selector; browser coverage switches between the original set and completed edit.
- Consecutive browser journeys shared the auth IP throttle. Test auth requests
  now use a distinct simulated private IP per user; production throttles remain
  enabled and unchanged. Storage uploads keep their original request headers.

# 2026-11-09 — Core completion verification
- Completed the six approved non-billing batches and retained the shared minimal
  orange/blue-gray theme and existing Home/Studio controls.
- Required checks pass: pnpm typecheck, pnpm lint and pnpm test across all 11
  packages (51 web tests, 22 estimate tests, 2 PDF tests and existing package suites).
- All six Playwright journeys pass together with fake image generation and console
  email. Coverage includes both onboardings, mobile Home rendering/edit/history,
  anonymous voting, and designer brief-to-PDF-to-client approval.
- Verified mobile Home, Studio and public-proposal screenshots at 375px; Studio
  tabs wrap so every section stays visible. Inspected both PDF fixture pages.
- Recorded E2E accounts and their generated storage objects are cleaned after runs.
- No billing, paid image generation, deployment or launch work was performed.
- V4 remains open only for human acceptance: real-provider fidelity/model decision,
  an unassisted timed designer walkthrough, and CI verification outside this local run.
- PDF generation remains on-demand in the web app (recorded deviation), with
  immutable stored PDFs and worker-based email delivery/retries.

# 2026-11-09 — Landing color correction
- Apply the requested gray/black-dominant palette to marketing surfaces.
- Give the hero and its preview panel explicit gray backgrounds.
- Replace cream surfaces and peach decoration with neutral grays.
- Use near-black headings, selected filters, feature icons and proof panels.
- Keep orange for primary conversion actions; use black for secondary actions.
- Preserve every existing section, component, control, image and destination.
- Scope palette variables to the marketing layout.
- Keep the existing spacing and responsive layout.
- Verify desktop and 375px screenshots and interactive controls.
- Run typecheck, lint and tests; commit this visual correction separately.
- Delivered scoped neutral-gray surfaces and near-black typography; primary CTAs
  retain orange, with black secondary and non-featured paid-plan actions.
- Desktop (1440px) and mobile (375px) screenshots reviewed. Hero computed colors
  are gray #DCE1E1 and near-black #141718; no mobile horizontal overflow.
- Gallery filters and FAQ interactions verified. All seven edited TSX files retain
  identical ordered JSX tags; no components or sections were removed or added.
- pnpm typecheck, pnpm lint and pnpm test pass across all 11 packages.

# 2026-11-09 — White landing canvas, light-gray components
- Follow the updated preference for a white page background.
- Keep light-gray cards, hero preview, badges and controls.
- Make section canvases white so cards remain visibly distinct.
- Retain near-black headings and secondary actions.
- Retain orange primary conversion buttons.
- Preserve all components, content, spacing and interactions.
- Keep the change scoped to marketing surfaces.
- Verify desktop and 375px mobile screenshots and colors.
- Run the required typecheck, lint and test commands.
- Commit the finished palette adjustment separately.
- Delivered white #FFFFFF canvases, light-gray #F2F3F3 cards and #EEF0F0 hero
  panels. Testimonials, process and pricing section backgrounds are also white.
- Desktop and 375px mobile previews reviewed; no horizontal overflow. Gallery
  filters and FAQ interactions pass; both edited TSX files preserve their JSX tags.
- pnpm typecheck, pnpm lint and pnpm test pass across all 11 packages.

# 2026-11-09 — Coherent room transformation assets
- Replace unrelated landing photography with purpose-made interior concepts.
- Generate original room photos, then edit those same photos into redesigns.
- Preserve camera position, windows, doors and room geometry in each pair.
- Give the hero four style variants of one living room.
- Replace all six gallery pairs with matching room transformations.
- Reuse the matching assets throughout process, feature and CTA sections.
- Keep the white/light-gray theme and existing component layout.
- Label generated examples as illustrative concept visuals.
- Use built-in imagegen, independently of the app's fake-provider test setting.
- Save final assets and prompt provenance inside the repository.
- Verify images, desktop/mobile rendering, slider/filter behavior and checks.
- Commit the completed replacement as one focused task.
- Delivered 16 optimized 1440x1080 WebP assets (~2.8 MB total): six source rooms,
  four living-room styles, five other room redesigns and one matching chat edit.
- Hero, six gallery pairs, process previews, feature cards and final CTA now use
  the coherent generated rooms; unrelated dress/cooking photos are no longer used.
- The refinement image matches its displayed sage-wall/floor-lamp instruction.
- Saved prompt/source provenance in docs/design/landing-image-prompts.json and
  an asset map in docs/design/landing-imagery.md. Examples are labelled illustrative.
- Desktop and 375px mobile screenshots reviewed. All images load; four hero
  styles, keyboard slider control and gallery filters pass. JSX tags are unchanged.
- pnpm typecheck, pnpm lint and pnpm test pass across all 11 packages.
