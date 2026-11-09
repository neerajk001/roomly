# Guided design — batch 2

Completed batch report. For the current combined implementation and open review
items, see [project status](../project-status.md) and the [batch index](README.md).

- [x] Contrasting style selection and explicit per-concept creative directions.
- [x] Conservative image similarity detection and one bounded replacement attempt.
- [x] Persisted retry budget, spend checks and accounting for discarded images.
- [x] Honest similarity feedback without changing existing room constraints or controls.
- [x] Regression tests, mobile/browser verification and completed-batch commit.

This is an approved UX improvement within the current phase, not a new V5/V6
phase. No new preview images, billing work, model selection, object detection,
masked editing or AI recommendation service is included.

## Implementation

“Choose contrasting looks for me” starts with the most contrasting pair in the
selected tradition, then selects a third look that differs from both. It uses
palette distance and curated ornament, furniture-form and texture attributes.
The number of picks respects the requested concept count, up to three looks.

Every RESTYLE slot gets an explicit direction: Light & open, Warm & tactile,
Bold & expressive, or Deep & refined. Prompts specify a colour hierarchy,
materials, furniture silhouettes, textiles and portable lighting, and describe
the alternative directions to avoid repeating. Selected styles, notes, budget,
kept items, renter rules and fixed room geometry remain authoritative. EDIT
jobs retain their existing behavior. New results show their intended direction;
previously completed jobs are not relabelled.

The worker compares normalized 32px colour samples and central-region gradient
patterns. It catches identical or very similar re-encoded images without paid
vision calls. At most one duplicate slot gets one extra generation call, always
from the original room photo. A failed, unreadable or less distinct replacement
does not discard the valid original set. Remaining similarity is disclosed in
both Home and Pro result views, including after reload.

The allowance is initialized in job JSON and claimed atomically before calling
the provider. A row lock preserves that claim when results metadata is written,
so queue retries or competing workers cannot reset it. Legacy jobs without an
allowance still render. The initial spend check includes the potential extra
call; the worker checks headroom again. Provider costs include discarded images,
and failed replacement calls without usage get the existing conservative cost
estimate. User credits continue to cover only the requested concept count.

## Limits and review boundary

Similarity is a conservative visual heuristic, not semantic design judgement or
a geometry-fidelity check. It can miss similar concepts or flag subtle changes.
The existing daily guard uses conservative estimates and recorded usage; this
batch does not introduce a global reservation system for all in-flight jobs.
One extra attempt may leave other similar images in a larger set, with clear
feedback rather than an unbounded generation loop.

No preview images, dependencies, migrations or environment variables were added.
Automated checks use fake generation; real-model visual quality still needs the
existing G2 fidelity review. Image-specific recommendations, object selection
and masked edits remain outside this batch.

## Validation

- `pnpm typecheck && pnpm lint && pnpm test`: all 11 packages pass.
- `pnpm test:e2e`: all six journeys pass, preserving existing Home chat edits,
  Pro brief-to-approval, favorites, sharing and anonymous voting.
- New unit tests cover contrasting picks, authoritative prompt constraints,
  re-encoded copies, distinct furnishings, the one-call limit, budget denial,
  failed/unimproved replacements and provider cost accounting.
- Database tests verify that competing claims consume the allowance once,
  metadata writes cannot reset it, and another workspace cannot claim it.
- The wizard browser test checks automatic contrasting picks, per-output mood
  labels and 375px layout. It deliberately injects the similar-results flag to
  verify that feedback even when fake-provider tint choices happen to differ.
- A focused rerun verifies all three lazy-loaded concept images decode on mobile;
  the final screenshot was visually reviewed. Test accounts/workspaces were cleaned up.
