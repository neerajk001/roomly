# Current project status

Updated 2026-11-09. This page describes the checked-in implementation. Dated
summaries and `DECISIONS.md` retain historical evidence; the V1–V6 phase checklists
remain the review gates and must not be treated as proof of production readiness.

## Guided-design delivery

| Batch | Implemented behavior | Status |
|---|---|---|
| [1](design/guided-design-batch-1.md) | Design tradition → room-specific look → optional budget → review; 25 preview atlases; every selected style assigned to an output | Complete |
| [2](design/guided-design-batch-2.md) | Contrasting picks and creative directions; conservative similarity detection; one bounded replacement attempt | Complete |
| [3](design/guided-design-batch-3.md) | Remembered concept selection, comparison/save/edit targeting, on-demand suggestions, separate drafts and concept-family history | Complete |
| [4](design/guided-design-batch-4.md) | Approximate object bounds, manual area selection, aligned masks, outside-area preservation and target metadata | Complete |
| [5](design/guided-design-batch-5.md) | Submission/status recovery, room/history state fixes, environment/test wiring and documentation reconciliation | Complete |

Guided-design batch 5 is separate from **V5 billing**, which is excluded from this
work. No new marketing/style imagery was generated after batch 1.

## Current experience

The seven-step Home wizard asks for photos, room details, kept items, renter
restrictions, design tradition and room-specific looks, optional budget direction,
then review and extra notes. Tradition and looks share the design step. Users can
choose budget-friendly, mid-range, premium or no tier, retain a custom amount,
and request contrasting looks. Up to three chosen styles map to generated slots.

Home and Pro use the same render/edit engine. Selecting a concept controls its
comparison, suggestions and editor. Selection survives reload; text drafts and
area selections stay separate per concept while the page is open. An edit shows
the exact source, retains its style/mood/notes/budget/keep-items/renter context,
and creates a linked version. The user explicitly applies each change.

Real vision analysis can return up to three refinement ideas and eight approximate
object rectangles. Users review/adjust object bounds or mark an area manually
with pointer, touch or keyboard controls. The worker creates a same-size PNG mask
and composites only the selected rectangle onto the source. Targeted stored
outputs are lossless PNGs with the source pixel dimensions. Bounds are not precise
object segmentation; a rectangle may include background or nearby objects and
can leave visible seams. There is no freehand mask brush.

Default `ADVICE_PROVIDER=fake` supplies clearly labelled preference-based demo
ideas and **no object detection**. Manual selection still works. Real analysis
requires `ADVICE_PROVIDER=openai`, `OPENAI_API_KEY` and an explicitly configured
`OPENAI_ADVICE_MODEL` supporting vision and structured output. No real-model
selection, paid call or visual-fidelity certification was performed in batches 3–5.
`ADVICE_CALL_BUDGET_MICROS` is a conservative accounting allowance, not an exact
bill or provider-enforced cap. See [.env.example](../.env.example).

Pro includes clients, uploaded briefs, grouped/reorderable rate cards and CSV
validation, immutable/versioned estimates, project totals, editable proposal
drafts, explicit revisions, frozen sent snapshots, image-bearing PDFs, client
approval/change requests and a durable notification outbox. See the updated
[Pro summary](v4-summary.md). Estimates use measurements and rate cards; image
analysis does not infer exact dimensions, prices, retailer availability or quotes.

## Remaining review and limitations

- **G2**: real-photo fidelity, detection accuracy, mask-boundary quality, chosen
  model/cost and failure behavior still need a separately authorized real-provider
  manual review. Fake-provider tests validate wiring, not generated design quality.
- **V4 review**: the real-provider manual workflow, CI evidence and unaided
  brief-to-approval usability timing remain open in the phase Definition of Done.
- **Production**: checked-in Docker/CI/deploy files are not evidence of a successful
  live deployment, restore drill or security review. Use the current runbook; do
  not infer that every V6 checkbox is complete.
- Diversity detection is heuristic. One bounded retry cannot guarantee radically
  different concepts. Spend guards use conservative accounting and do not reserve
  all in-flight image costs globally.
- Billing, retailer catalogs, layout engines, 3D and construction guarantees are
  excluded. Draft text/area persistence across reload is not implemented; only
  concept selection and the guided wizard's non-file preferences persist locally.

## Verification record

Batch 5: typecheck, lint and all package tests pass (73 web tests); all six browser
journeys pass, including injected status-read failures and recovery; the production
build passes. Mobile screenshots, Markdown links, env wiring and shell syntax were
checked. Five recorded browser-test accounts/workspaces were cleaned up. Batch 4
mask/worker tests continue to verify protected pixels and source dimensions.
Detailed evidence and limitations are in each completed batch report.

Run `pnpm typecheck && pnpm lint && pnpm test`, `pnpm test:e2e`, then `pnpm build`.
The root test command serializes Turbo package tasks to avoid the observed shared
Vitest cache startup race. Tests use fake/mocked image and analysis providers.
