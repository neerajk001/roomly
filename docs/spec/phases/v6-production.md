# V6 — Productionize

**Goal:** the product is secure, observable, recoverable, legally ready and deployed with a repeatable release process. Ends with a launch checklist the human signs off.

**Read first:** `AGENT.md`, `01-architecture.md`, `03-auth-and-workspaces.md`, `04-ai-pipeline.md`.

## Decision gate

- **G3 Hosting target**: (a) web on Vercel (or similar) + worker on the founder's own server, or (b) everything in Docker on servers. Database SHOULD be a managed Postgres with automated backups and point-in-time recovery (not a database on the same small server). Ask the human before building deployment files.

## 1. Security hardening

- [ ] **Authorization audit**: list every server action and route handler; confirm each calls `requireWorkspace` (or token validation for public routes) and scopes queries by `workspaceId`. Record the table in `docs/security-audit.md`.
- [ ] Extend tenant-isolation tests so every service is covered.
- [ ] **Security headers**: CSP (allow only own origin, the S3/CDN host for images, the payment provider, and analytics), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS, frame-ancestors none.
- [ ] **Rate limiting** with one `rateLimit(key, limit, windowSec)` interface. Start with a Postgres-backed table; allow swapping to Redis/Upstash. Apply to: auth endpoints, render creation, uploads/presign, public brief and proposal actions, share votes, comments.
- [ ] **Upload safety**: server-side image validation already exists (V2). Add: max uploads per hour per workspace, max total storage per plan, orphan cleanup job verified.
- [ ] **Abuse controls for free credits**: email verification required to spend; disposable-domain blocklist; per-IP signup limit; daily spend circuit breaker alert when ≥ 80% of `MAX_DAILY_SPEND_USD`.
- [ ] **Secrets**: all via environment variables on the host; rotate the auth secret and provider keys once before launch; confirm nothing sensitive is in git history (run a secret scanner in CI).
- [ ] **Dependency hygiene**: `pnpm audit` and automated dependency updates (Dependabot/Renovate) with CI gating.
- [ ] **Signed URLs**: expiry ≤ 1 hour for private images; public proposal PDFs use short-lived signed URLs generated per view.
- [ ] Content moderation: moderation check on user text sent to the image provider; handle blocks gracefully (refund, friendly message). Reporting channel in the footer.

## 2. Reliability

- [x] Worker: graceful shutdown, health endpoint or heartbeat log, restart policy, concurrency limits per provider rate limits.
- [ ] Queue: dead-letter handling for jobs failed after retries (alert + visible `FAILED` state + refund verified).
- [ ] **Stuck job sweeper**: scheduled job that fails and refunds `RUNNING` jobs older than a timeout (e.g. 10 minutes).
- [x] Database: connection pooling configured for serverless web runtime; Prisma migrations applied with `prisma migrate deploy` in the release pipeline; migration rules documented (additive first, backfill, then remove).
- [ ] **Backups**: automated daily backups + point-in-time recovery enabled on the managed DB. **Run a restore drill** into a scratch database and record the steps and time in `docs/runbook.md`.
- [ ] Object storage: versioning or lifecycle rules for deleted objects; bucket not publicly listable.
- [ ] Idempotency review: render creation, credit grants, webhooks, email sends (no duplicate emails on retry).

## 3. Observability

- [ ] **Sentry** for web and worker (source maps, release tagging, scrub PII and tokens).
- [ ] pino structured logs with request ids and job ids. No secrets, no image bytes, no signed URLs.
- [ ] Metrics (log-based or a metrics service): render success rate, render latency p50/p95, queue depth and age, provider error rate, cost per render, credits spent per day, daily provider spend, sign-ups, proposals sent/approved.
- [ ] Alerts (email or chat): render failure rate > 10% over 15 min, queue age > 5 min, daily spend ≥ 80% of limit, webhook failures, error spike, DB connection errors.
- [ ] Uptime check on the web app and a synthetic check that runs a fake-provider render in staging.
- [ ] Simple admin page (founder-only, gated by an allowlist env var) showing today's spend, job counts by status, recent failures, and a credit adjustment tool that writes `ADJUSTMENT` ledger rows with a note.

## 4. Performance and cost

- [ ] Images: serve thumbnails in grids, lazy-load, correct `Cache-Control`, optional CDN in front of storage.
- [ ] Next.js: loading skeletons, avoid waterfalls, cache public marketing pages, measure Lighthouse (≥ 90 mobile on marketing pages).
- [ ] Database: review slow queries with `EXPLAIN`; add indexes where needed (keep the schema's indexes).
- [ ] Provider cost: route drafts to the cheapest acceptable model/quality; use the better tier only for "final". Review `pnpm report:costs` weekly.
- [ ] Optional stretch: geometry drift check on outputs (see `04-ai-pipeline.md`) to auto-reject bad variations and refund.

## 5. Legal and trust (draft with the human; get professional review where needed)

- [ ] Terms of Service, Privacy Policy, Cookie notice/consent where required, Refund policy page.
- [ ] AI disclosure everywhere renders appear: "AI-generated concept visual. Not to scale."
- [ ] Proposal/estimate disclaimer (already in PDF) reviewed.
- [ ] User data controls: export my data, delete my account and data (cascade deletes + storage cleanup job), delete a project and its assets.
- [ ] Image retention setting (delete original photos after N days) and a documented default.
- [ ] Rights and takedown contact in the footer; copyright/IP statement for generated images as advised by a lawyer.
- [ ] Processor list for the privacy policy (hosting, storage, email, AI provider, payments, analytics, Sentry). Confirm the AI provider's data-use terms for API inputs.

## 6. Growth basics

- [ ] Programmatic SEO pages for combinations of style × room type (e.g. `/styles/japandi/living-room`) with real generated example galleries (generated once with the real provider, reviewed by a human, then stored), unique copy per page, schema markup, sitemap, canonical URLs. Avoid thin duplicate content: only publish combinations that have unique content.
- [ ] Open Graph images for share links and style pages.
- [ ] Pricing page and landing page with before/after examples and a clear Home vs Pro split.
- [ ] Transactional emails polished (verification, reset, proposal sent/viewed/approved, plan, low credits).

## 7. Deployment

- [ ] Environments: `local`, `staging`, `production`, each with separate DB, bucket, keys, and billing test/live modes.
- [x] Dockerfiles for `web` and `worker` (multi-stage, non-root user, pinned base image) and a production `docker-compose` or platform config per the G3 decision.
- [x] CI/CD: on merge to `main` → test → build → deploy to staging → smoke tests → manual approval → production. Run `prisma migrate deploy` as a release step before the new version starts receiving traffic.
- [x] Rollback plan documented (previous image, migration compatibility).
- [ ] Domain, TLS, DNS, email sending domain with SPF, DKIM and DMARC configured; verification emails land in inbox.
- [x] Environment variable matrix documented in `docs/runbook.md`.

## 8. Testing before launch

- [ ] Full Playwright suite green against staging (fake provider) and a manual pass with the real provider.
- [ ] Load test of key paths (login, project list, render creation, public proposal page) with k6 or similar at 10× expected alpha traffic; record results.
- [ ] Manual security checklist: try cross-workspace access by guessing ids, replay webhook, tamper with tokens, upload malicious files, oversized inputs.
- [ ] Accessibility check (axe) on main flows.
- [ ] Mobile device pass (iOS Safari, Android Chrome).
- [ ] Payment test-mode and then one live low-value real purchase and refund.

## 9. Documentation

- [ ] `docs/runbook.md`: deploy, rollback, restore drill, how to inspect failed jobs, how to refund credits, how to rotate secrets, who to contact at each provider.
- [ ] `docs/security-audit.md` (from section 1).
- [ ] `docs/architecture.md`: short, current diagram and decisions (derived from `DECISIONS.md`).

## Launch checklist (human signs off)

- [ ] Every V1–V5 Definition of Done is complete.
- [ ] G1–G5 decisions recorded.
- [ ] Backups restored successfully in a drill.
- [ ] Alerts fire correctly in a test.
- [ ] Legal pages published and reviewed.
- [ ] Spend guard set to a sane value for launch week; alert contacts confirmed.
- [ ] Support email works and is monitored.
- [ ] Private alpha invite list ready (10 designers, 20 homeowners).
- [ ] Rollback tested once.

## Definition of Done for V6

- [ ] All boxes ticked; CI/CD green; production deployed and passing smoke tests.
- [ ] Runbook and audit documents complete.
- [ ] Summary for the human with remaining risks and a prioritized post-launch backlog.

**Post-launch backlog (do not build now):** layout engine, product catalog with real retailers, team seats and roles, invoicing and milestone payments, 3D walkthroughs, mobile apps, annual plans and coupons.
