# Guided design — batch 1

Completed batch report. For the current combined implementation and open review
items, see [project status](../project-status.md) and the [batch index](README.md).

- [x] Design-tradition catalog with stable legacy style keys.
- [x] Distinct photographic previews for the selected room type.
- [x] Tradition → style → optional budget → review flow.
- [x] Every selected style reaches its assigned generation output.
- [x] Preference persistence and backward-compatible existing jobs.
- [x] Validation, worker regression tests and mobile/browser verification.

Diversity, image-specific suggestions and object/area editing were delivered in
batches 2–4; they are outside this batch 1 report.

## Built

The existing seven-step wizard now presents a design tradition before specific
looks, then an optional budget. There are 25 looks across eight regional groups
plus an explore-all option. Each has descriptions, a palette and nine photographic
room references. “Other” explicitly uses a living-room reference.

Budget-friendly, mid-range and premium guide furniture and finish choices. Users
can deselect a tier, choose no preference or retain a custom amount. Money input
uses the existing integer parser in `packages/estimate`.

Every selected look is assigned to a concept slot; selecting more looks than
concepts is rejected in the UI, service and worker. Output labels use the assigned
look. Notes, existing keep-items, renter constraints and staging picks reach each
generation prompt. The original uploaded image remains the source for each slot.

Preferences persist in validated local drafts and existing job JSON. Legacy jobs
fall back to their single style key, and old draft step numbers migrate safely.
There is no database migration, new dependency, environment variable or billing change.

## Assets

Built-in imagegen generated 25 square photographic atlases, optimized to WebP in
`apps/web/public/styles/previews/`. Each atlas has nine room tiles. Final prompts
and the room layout are recorded in `docs/design/style-preview-prompts.json`.
Existing landing-page before/after assets are retained.

## Review boundary

This report covers batch 1. Diversity planning, similarity checks, suggestions
and object/area editing are documented in the completed batch 2–4 reports. Real-provider fidelity still needs the existing G2 review; automated
generation checks use the fake provider.

## Validation

- `pnpm typecheck && pnpm lint && pnpm test`: all 11 packages pass.
- `pnpm test:e2e`: all six browser journeys pass, including existing Home chat
  editing, the Pro brief-to-approval workflow and the revised guided wizard.
- The guided journey checks all 25 preview URLs, kitchen-specific previews,
  375px overflow, tier selection/clearing, style-count validation, actual output
  labels, favorites, sharing and anonymous voting.
- Reviewed mobile style-selection and desktop review screenshots. Verified 25
  distinct 1200 × 1200 WebP atlases; no landing assets were replaced.
- No new environment variables or dependencies. Batch 2 is complete; see its report.
