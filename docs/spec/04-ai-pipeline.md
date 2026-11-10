# 04 — AI Pipeline

Packages: `packages/ai` (provider, prompts, pricing), `packages/storage` (S3, sharp), `apps/worker` (job execution).

## Provider interface

```ts
export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";
export type ImageQuality = "low" | "medium" | "high";

export interface EditInput {
  mask?: Buffer;            // PNG; transparent editable region, same oriented dimensions
  image: Buffer;
  mime: string;
  prompt: string;
  n: number;                 // number of variations
  size: ImageSize;
  quality: ImageQuality;
  signal?: AbortSignal;
}

export interface EditResult {
  images: { data: Buffer; mime: string }[];
  costMicros: number;        // computed from provider usage data and pricing.ts
  model: string;
}

export interface ImageProvider {
  readonly name: "fake" | "openai" | string;
  edit(input: EditInput): Promise<EditResult>;
}
```

### Implementations

- **`fake`**: returns the source image with a color tint and an overlay label of the prompt style. Costs 0. Takes ~1s. Used in dev, tests and CI.
- **`openai`**: image edit endpoint with the source photo as input. Model id comes from `OPENAI_IMAGE_MODEL`. Verify the current endpoint, model ids and response shape in the provider docs before implementing.
- Later providers (Gemini image, FLUX Kontext, etc.) implement the same interface. Switch with `IMAGE_PROVIDER`.

### Pricing (`packages/ai/src/pricing.ts`)

Keep a typed table of provider/model prices with a comment containing the date and source URL. Compute `costMicros` from the usage data the provider returns (tokens, or per-image rate). If usage data is missing, fall back to a conservative flat estimate and log a warning. Prices change: this file is the only place they live.

## Prompts (`packages/ai/src/prompts.ts`)

Prompts are pure functions with unit tests (snapshot the strings).

**RESTYLE**
```
Redesign this {roomType} in a {styleLabel} interior design style.
Keep the room's structure exactly as in the photo: walls, windows, doors, ceiling, camera angle and perspective.
Keep these items unchanged: {keepList or "none"}.
{renterClause}
Photorealistic interior photograph with natural lighting. No text, logos or watermarks.
```

**renterClause** (when `renterMode`)
```
Only change things a renter can change without construction: wall paint, rugs, curtains, lighting fixtures, furniture and decor. Do not change flooring, windows, doors, built-in cabinets or room structure.
```

**EDIT**
```
Apply only this change: {instruction}.
Keep everything else in the image identical, including the room structure, camera angle and all other objects.
```

Rules:
- `instruction` is user text: trim, max 300 characters, strip control characters. Run it through a moderation check before queueing if the provider offers one.
- Dimensions are NOT sent to the model as facts. They drive estimates only.
- Styles live in `packages/shared/src/styles.ts` as `{ key, label, promptHint, thumbnail }`. Starter set: modern, contemporary, minimalist, scandinavian, japandi, mid-century, industrial, bohemian, coastal, farmhouse, traditional, art-deco, indian-contemporary, mediterranean.

## Credits

Config in `packages/shared/src/credits.ts`:
```ts
export const CREDIT_COST = {
  draft: 1,   // per generated variation, quality "low" or "medium"
  final: 3,   // per generated variation, quality "high" at larger size
};
```
Tune after measuring real costs (V5, decision gate G5).

### Reserve → settle → refund

1. **Reserve** (in a DB transaction, in the web service):
   - Lock the workspace row (`SELECT ... FOR UPDATE` through `$queryRaw`) or use a serializable transaction.
   - Compute `balance = SUM(delta)`. If `balance < cost`, throw `INSUFFICIENT_CREDITS`.
   - Insert ledger row: `delta = -cost`, `reason = RENDER_RESERVE`, `refId = jobId`.
   - Create `RenderJob` with `creditsCharged = cost`.
2. **Settle**: on success, nothing more. The reserve is the charge.
3. **Refund**: on final failure or cancel, insert `delta = +cost`, `reason = RENDER_REFUND`, `refId = jobId`. The unique `(reason, refId)` makes it idempotent.

## Render job lifecycle

States: `QUEUED → RUNNING → SUCCEEDED | FAILED | CANCELED`.

**Web service `createRender(ctx, input)`**
1. `requireVerifiedEmail`.
2. Validate input with zod (room belongs to workspace, source asset belongs to room and is confirmed).
3. **Spend guard**: sum `costMicros` of today's jobs (UTC). If ≥ `MAX_DAILY_SPEND_USD × 1,000,000`, throw `SERVICE_BUSY` (friendly message, no credit charge).
4. Reserve credits + create job (one transaction).
5. Enqueue `render.generate` with `{ jobId }` only (singleton key = jobId so it cannot run twice).

**Worker `render.generate({ jobId })`**
1. Load the job. If status is not `QUEUED`, exit (idempotent).
2. Set `RUNNING`, `startedAt`, `attempts += 1`.
3. Download the source from S3. Build the prompt from job params.
4. Call `provider.edit` with a timeout (e.g. 120s) through an `AbortSignal`.
5. For each image: validate with sharp, create a web version (max 2048px, JPEG/WebP) and a thumbnail (max 512px), upload both, create `Asset` rows (`RENDER`, `THUMBNAIL`), create `RenderOutput` (`index`).
6. Set `SUCCEEDED`, `finishedAt`, `costMicros`, `model`.
7. On transient errors (network, 429, 5xx): retry up to 2 times with exponential backoff (queue retry options). On permanent errors (invalid image, moderation block): fail immediately.
8. On final failure: set `FAILED` with a short `errorCode`, a user-safe `errorMessage`, then refund credits.

**Chat edit** creates a new job with `kind = EDIT`, `parentJobId` = the previous job, `sourceAssetId` = the chosen output's asset. Chains can be walked backwards for history.

### Guided-design implementation (batches 1–5)

The [batch reports](../design/README.md) and [current status](../project-status.md)
describe the delivered extensions. RESTYLE assigns selected styles to individual
slots and uses distinct creative directions. A conservative near-copy check can
replace one slot once per job; provider costs include discarded attempts, while
user credits cover only requested outputs. This does not guarantee semantic diversity.

EDIT always generates one output and stores the exact `sourceOutputId`, inherited
style/mood/notes/budget, and optional validated `editTarget` in job JSON. Kept-item
and renter constraints reach edit prompts. Target coordinates are integer
thousandths of the oriented image, checked by the server and worker. The worker
builds a same-size PNG mask, uses automatic sizing, then composites only the
selected regions onto the source and stores a lossless PNG at source dimensions.
Targets retain the original `region` with optional `additionalRegions` (at most
five total). Server/worker validation bounds combined coverage to 80%; gaps and
outside pixels stay protected. Rectangle edges may still show seams.

Before RESTYLE image calls, [batch 2 room assessment](../design/room-assessment-batch-2.md)
checks the latest confirmed source photo, room boundaries/floor evidence, access
constraints, supplied millimetre measurements and each requested furnishing's
qualitative footprint/placement. Low confidence, missing evidence or uncertain
fit requires a better photo; an infeasible requested item requires revised
choices. No guessed dimensions or measured-fit guarantees are stored. The layout
plan reaches every variation and diversity retry with the existing structural
lock. EDIT keeps its existing focused behavior; camera widening and post-render
geometry verification are later batch 3 work.

Jobs claim QUEUED→RUNNING atomically. Assessment is attempted at most once per
job; ready evidence is reused only for the same source/context/model on queue
retries. Changed context or interrupted/failed assessment does not trigger another
automatic vision call. Real assessment reserves the existing per-call allowance
under the shared spend lock in `adviceSpendByDay`, including failed attempts; the
guard includes expected image-call headroom and rechecks cached retries. API calls
run outside database transactions. Blocked jobs publish no outputs; FAILED status
and idempotent generation-credit refund commit together.

Fake image jobs use an explicitly labelled demo assessor. Real image jobs require
the configured OpenAI advice provider/model and cannot pass using demo evidence.
Without that approved activation, real RESTYLE generation stops/refunds instead
of generating unchecked images. No provider setting is changed by this batch.
New designs use the newest confirmed photo; history/status expose the authorized
input URL used by each job, so older comparisons keep their own source image.

On-demand concept analysis is separate from render generation. It accepts only
an authorized output ID and optional validated target/hint, loads a server-owned
thumbnail plus ordered selection close-ups, and validates up to three
suggestions and eight approximate object rectangles. `ADVICE_PROVIDER=fake` is an
honest preference-only demo with no detection. Real analysis requires an explicitly
configured `OPENAI_ADVICE_MODEL`. Cache/attempt metadata lives in the existing job
params under row locks; calls have a timeout, no automatic provider retries, a
workspace rate limit and at most two attempts per cache entry/provider. General
advice keeps its output key; selected analysis keys include coordinates and hint,
with at most six selection variants per output. Each selected call reserves the
configured allowance multiplied by the full-image-plus-crop count. It never
generates a render or charges generation credits. Per-day advice
allowances count against the shared spend guard even on older jobs and failed
calls. This is conservative accounting, not a global reservation of all in-flight
image work or a provider-enforced billing cap.

Status responses also include selected-style/direction labels, edit-source and
target metadata, cached advice and similarity feedback. Clients validate responses
and requested job IDs. Status reads are cancellable and bounded; a paused read can
be resumed without creating another job. Unconfirmed mutation responses preserve
the user's draft and are never automatically resubmitted.

Home quick-start additionally stores optional `includeItems` in job params. The
shared catalog defines distinct item IDs/labels for all ten room types. The service
authorizes the room and checks selections against its stored type before reserving
credits; the worker checks again. Curated labels reach every concept prompt with
compact-sizing/circulation/fixed-architecture constraints. These are inclusion
preferences, not exact-object keep rules. Edits inherit them but can explicitly
remove/replace a category; Generate more carries them forward. Legacy
`stagingItems` are still parsed independently for backward compatibility.

## Status API

`GET /api/renders/:id` returns `{ id, status, errorMessage?, outputs: [{ id, thumbUrl, url, isFavorite }] }`. Scoped by workspace. The UI polls every 2s with a cap, then backs off. Signed GET URLs expire (e.g. 1 hour). Do not store signed URLs in the DB.

## Image safety and privacy

- Accept only JPEG, PNG, WebP. Max 10 MB, max 4096 px on the long side. Re-encode with sharp (strips EXIF, including GPS).
- Never log image bytes or signed URLs.
- Retention (V6): option to delete original photos after N days.
- Disclaimer on every render view: "AI-generated concept visual. Not to scale."

## Free-tier watermark

Applied at **delivery time** (preview and download) with sharp for workspaces without a paid plan. Never overwrite the stored original.

## Tests

- Prompt snapshots.
- Pricing: given sample usage → expected `costMicros`.
- Credits: reserve with insufficient balance fails; concurrent reserves cannot overspend (run two in parallel); refund is idempotent.
- Worker with `fake` provider: success path, transient retry then success, permanent failure then refund.
- Spend guard blocks when limit reached.
- Stretch (V6): geometry drift check — compare edge maps of source vs output and flag outputs whose structure changed too much.
