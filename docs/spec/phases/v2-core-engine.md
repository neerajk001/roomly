# V2 — Core Engine

**Goal:** a signed-in user can create a project and room, upload a photo, enter dimensions, request AI renders, see 4 variations, edit them by chat, and favorite or download. Credits are reserved and refunded correctly. Cost per render is recorded.

**Read first:** `AGENT.md`, `04-ai-pipeline.md`, `05-estimate-engine.md` (for room dimensions), `02-database.md`, `03-auth-and-workspaces.md`.

## 1. Storage

- [ ] `packages/storage`: S3 client (AWS SDK v3, works with R2 and MinIO), `presignPut`, `presignGet`, `headObject`, `getObject`, `putObject`, `deleteObject`.
- [ ] Storage keys: `ws/{workspaceId}/{kind}/{assetId}.{ext}`. Never use user-supplied file names in keys.
- [ ] `POST /api/uploads/presign` → validates `{ roomId?, mime, sizeBytes }` (JPEG/PNG/WebP, ≤10 MB), creates an `Asset` (unconfirmed), returns `{ assetId, uploadUrl, headers }`.
- [ ] `POST /api/uploads/:assetId/confirm` → checks the object exists, reads it with sharp, validates it is a real image ≤4096px on its long side, re-encodes (strips EXIF), generates a thumbnail, sets `confirmedAt`, width, height, size.
- [ ] Unconfirmed assets older than 24h are deleted by a worker cleanup job (pg-boss scheduled job).
- [ ] Signed GET URLs are generated on demand with short expiry and never stored.

**Acceptance:** uploading a GPS-tagged JPEG results in a stored image without EXIF. A fake image with a `.jpg` name is rejected. A file over 10 MB is rejected before upload starts.

## 2. Projects and rooms

- [ ] Services: `createProject`, `listProjects`, `getProject`, `renameProject`, `softDeleteProject`; `createRoom`, `updateRoom`, `deleteRoom`. All scoped by `ctx.workspaceId`.
- [ ] Project list page (grid, newest first, empty state with a clear CTA) in both `/app` and `/studio`.
- [ ] Room form: name, room type, width/length/height with a unit toggle (metric ↔ imperial; stored in mm), openings editor (add door/window with width, height, qty).
- [ ] Photo upload component: drag & drop + camera on mobile, progress, retry, preview. Supports 1–3 photos per room (first is the primary source).
- [ ] Validation: dimension limits (e.g. 1000–30000 mm; height 2000–6000 mm). Friendly error messages.

**Acceptance:** all CRUD works; deleting a project hides it (soft) and its renders; data from another workspace is never reachable (isolation tests below).

## 3. AI package and worker

- [ ] `packages/ai`: `ImageProvider` interface, `fake` provider, `openai` provider, `pricing.ts`, `prompts.ts` with unit tests (see `04-ai-pipeline.md`).
- [ ] `packages/shared`: `styles.ts` (starter styles with `promptHint` and thumbnail path), `credits.ts`.
- [ ] `apps/worker`: pg-boss setup, graceful shutdown (finish current job on SIGTERM), health logging, `render.generate` handler exactly as in `04-ai-pipeline.md`, retries and backoff, cleanup job.
- [ ] Image post-processing in the worker: web version (≤2048px), thumbnail (≤512px), asset rows, `RenderOutput` rows.
- [ ] Cost recording: `costMicros` from provider usage and `pricing.ts`.

**Acceptance (fake provider):** a job moves QUEUED → RUNNING → SUCCEEDED with 4 outputs in about 1–3 seconds. A forced transient error retries and succeeds. A forced permanent error ends FAILED with credits refunded exactly once.

## 4. Credits and spend guard

- [ ] `getBalance(workspaceId)`, `reserveCredits(tx, ...)`, `refundCredits(tx, ...)` using the append-only ledger and the unique `(reason, refId)` constraint.
- [ ] `createRender` service enforcing: verified email, input validation, ownership, spend guard (`MAX_DAILY_SPEND_USD`), credit reservation, enqueue.
- [ ] Balance shown in the app header. Insufficient credits → clear message (upgrade CTA is a stub until V5).

**Acceptance:** two parallel `createRender` calls with a balance enough for one: exactly one succeeds. Refund twice → one ledger row.

## 5. Render UI

- [ ] "Generate" panel: style picker (grid of styles), optional notes, variations count (default 4), quality (draft/final). Shows credit cost before confirming.
- [ ] Progress state with polling `GET /api/renders/:id` (2s, with backoff). Handles FAILED with a friendly message and a retry button (refund already given).
- [ ] Result grid: 4 outputs, click to enlarge, favorite (heart), download, "Edit this" opens the chat-edit box.
- [ ] Chat edit: text box (max 300 chars) creates an `EDIT` job from the chosen output. Shows the chain as a simple history strip.
- [ ] Disclaimer: "AI-generated concept visual. Not to scale."
- [ ] Mobile layout works at 375px. Images lazy-load with thumbnails first.

## 6. Real provider check (decision gate G2)

- [ ] Add a script `pnpm ai:fidelity` that runs a small fixed set of sample room photos (supply 5 in `fixtures/rooms/`) through the real provider at low, medium and high quality, saves outputs to `tmp/fidelity/`, and prints a table of cost per call from `costMicros`.
- [ ] The script refuses to run unless `IMAGE_PROVIDER=openai` and a `--budget-usd` flag is passed. It stops when the budget is reached.
- [ ] **Stop and report** the table and a short note on structure drift to the human. The human picks the provider, model and quality tiers (G2).

## 7. Tests

- [ ] Isolation tests for projects, rooms, assets, render jobs, credits (workspace A cannot touch B).
- [ ] Credits tests (insufficient, concurrency, idempotent refund).
- [ ] Worker tests with the fake provider (success, retry, permanent failure).
- [ ] Spend guard test.
- [ ] Upload validation tests (type, size, corrupt file, EXIF stripping).
- [ ] Playwright (fake provider): create project → add room → upload → generate → see 4 outputs → chat edit → favorite.

## Definition of Done for V2

- [ ] All boxes ticked; CI green.
- [ ] The e2e flow works locally with `IMAGE_PROVIDER=fake`.
- [ ] Fidelity report delivered; G2 decision recorded in `DECISIONS.md`.
- [ ] Summary for the human.

**Out of scope for V2:** style quiz, budget, estimates, sharing, watermark, billing, Pro features.
