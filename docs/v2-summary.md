# V2 — Core Engine: summary for review

Historical phase-completion snapshot. Features, counts and open items below describe
that review point, not current status. See [current project status](project-status.md)
for the delivered guided flow, current auth and remaining review gates.

## What works

- **Uploads**: S3 presign + confirm routes, 10 MB / JPEG-PNG-WebP / 4096 px limits, sharp re-encode
  (EXIF + GPS stripped), thumbnails, per-room limit of 3 photos, hourly cleanup of unconfirmed
  uploads in the worker.
- **Projects/rooms**: scoped services (create/list/get/rename/soft-delete; create/update/delete
  rooms), project grids in `/app` and `/studio`, room form with metric↔imperial toggle and a
  doors/windows editor (stored in millimetres), room page with uploads and renders.
- **Render pipeline**: `packages/ai` (fake + OpenAI providers, prompt builders with unit tests,
  token-based pricing with fallback), pg-boss worker (`render.generate`, retry with exponential
  backoff, graceful shutdown, cleanup cron), web/thumbnail asset creation, cost recording.
- **Credits**: append-only ledger with row-locked reserve, idempotent refund, balance in both app
  headers, insufficient-credit errors, daily spend guard, verified-email gate.
- **Render UI**: style picker (14 styles), variations/quality with cost preview, polling with
  backoff, 4-up result grid, lightbox, favorites, download, chat edit with history strip, disclaimers.
- **Tests**: 4 Playwright E2E (incl. the full 375 px render flow), worker retry/failure tests,
  credits concurrency/idempotency, isolation suites, upload validation. `typecheck`, `lint`, `test`,
  `test:e2e` and `build` all pass locally.

## Blocked / not done

- **G2 (image provider, model, quality tiers)**: `pnpm ai:fidelity --budget-usd 3` is implemented and
  gated, but needs a real `OPENAI_API_KEY` and five real photos in `fixtures/rooms/`. No fidelity
  report has been produced.
- CI has not run on GitHub (no remote yet); the workflow now includes migrations, unit tests,
  Playwright browser install and the render E2E.

## Open questions for the human

1. Supply an OpenAI key + 5 photos so I can run the fidelity check and report costs/structure drift?
2. If yes, what budget cap is acceptable for that run?
3. Or should G2 be decided later (keep `fake` for now) and move on to V3?

## Deviations (also in `DECISIONS.md`)

`RenderOutput.thumbAssetId` added; credit helpers live in `packages/db`; moderation runs at the
provider (no pre-queue moderation call); optional RESTYLE notes appended as an extra prompt line;
local `SIGNUP_FREE_CREDITS=12`; auto-verify on sign-up when verification is disabled.
