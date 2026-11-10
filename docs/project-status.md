# Current project status

Updated 2026-11-10. This page describes the checked-in implementation. Dated
summaries and `DECISIONS.md` retain historical evidence; the V1–V6 phase checklists
remain the review gates and must not be treated as proof of production readiness.

## Guided-design delivery

| Batch                                | Implemented behavior                                                                                                             | Status   |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | -------- |
| [1](design/guided-design-batch-1.md) | Design tradition → room-specific look → optional budget → review; 25 preview atlases; every selected style assigned to an output | Complete |
| [2](design/guided-design-batch-2.md) | Contrasting picks and creative directions; conservative similarity detection; one bounded replacement attempt                    | Complete |
| [3](design/guided-design-batch-3.md) | Remembered concept selection, comparison/save/edit targeting, on-demand suggestions, separate drafts and concept-family history  | Complete |
| [4](design/guided-design-batch-4.md) | Approximate object bounds, manual area selection, aligned masks, outside-area preservation and target metadata                   | Complete |
| [5](design/guided-design-batch-5.md) | Submission/status recovery, room/history state fixes, environment/test wiring and documentation reconciliation                   | Complete |

Guided-design batch 5 is separate from **V5 billing**, which is excluded from this
work. No new marketing/style imagery was generated after batch 1.

The subsequent [room workspace UX correction](design/room-workspace-ux.md)
separates **Designs / Costs / Room setup** and moves editing into a focused modal
canvas with a side inspector (stacked bounded panes on mobile). Suggestions live
in the editor's Ideas view. These features are no longer appended as one long
results-page form; costs, setup and all existing controls remain accessible.

## Current experience

The [application simplification](design/friction-fixes.md) consolidates Home/My
spaces into My rooms, opens single-room designs directly and moves mode/settings
links into the profile menu. Results use one selected-design action bar; comparison,
ideas and history stay secondary. Sharing opens in the room and Costs has one live
panel. Saved filters are room/style filters with each output's assigned style.
The correction passes package checks (76 web tests) and all six browser journeys
across the final full/focused runs; see its report for precise verification scope.
The subsequent production build passes. Existing G2/V4 manual review gates remain open.

The [Home quick-start](design/home-quick-start.md) is one screen: a photo, room type,
optional must-have checkboxes and Generate. All ten room types have distinct lists;
changing the room clears its old picks. Nothing is automatically checked. These
are categories to include, not exact objects to preserve. A short custom request
is optional. There is no required instructions, measurements, renter or budget questionnaire. Optional style
selection sits behind one control; the default requests three contrasting ideas.
Costs/measurements and detailed editing remain available after the first result.

Pro defaults to a combined project/client/room/photo quick-start. The earlier
seven-step flow remains under optional detailed setup. Earlier batch reports
describe its original delivery and do not define the current homeowner entry flow.

Home and Pro use the same render/edit engine. Selecting a concept controls its
comparison, suggestions and editor. Selection survives reload; text drafts and
area selections stay separate per concept while the page is open. An edit shows
the exact source, retains its style/mood/notes/budget/keep-items/renter context,
and creates a linked version. The user explicitly applies each change. The editor
fits the entire source image, keeps Apply visible, traps focus and restores the
opener on exit. Setup and estimate sections retain their state when switching tabs.

Real vision analysis can return up to three refinement ideas and eight approximate
object rectangles. Users review/adjust object bounds or mark up to five separate
areas with pointer, touch or keyboard controls. They can redraw, remove or clear
areas. Analyse selected areas works without an instruction: the full image and
ordered close-ups inform suggestions, which the user chooses or replaces with a
command before explicitly applying. Changing the selection hides stale ideas.
The worker creates a same-size PNG mask and composites only the selected regions,
protecting the gaps as well as outside pixels. Targeted stored
outputs are lossless PNGs with the source pixel dimensions. Bounds are not precise
object segmentation; a rectangle may include background or nearby objects and
can leave visible seams. There is no freehand mask brush. See the
[selected-area report](design/selected-area-analysis.md). Initial Home/Pro
quick-start also offers a bounded, optional custom request beside the checklist;
it is saved with the project and passed to generation/edit context.

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
  concept selection and validated non-file Home/Pro entry preferences persist locally.

## Verification record

Batch 5: typecheck, lint and all package tests pass (73 web tests); all six browser
journeys pass, including injected status-read failures and recovery; the production
build passes. Mobile screenshots, Markdown links, env wiring and shell syntax were
checked. Five recorded browser-test accounts/workspaces were cleaned up. Batch 4
mask/worker tests continue to verify protected pixels and source dimensions.
Detailed evidence and limitations are in each completed batch report.

Run `pnpm typecheck && pnpm lint && pnpm test`, `pnpm test:e2e`, then `pnpm build`.

The subsequent workspace/quick-start correction passed typecheck, lint and all
package tests (75 web tests), plus all six browser journeys on 2026-11-10. All ten
room lists and desktop/375px layouts were checked. Five test accounts/workspaces
were cleaned up. Playwright now isolates its fake worker using `QUEUE_SCHEMA`;
normal web/worker processes retain the default queue schema.
The subsequent production build passes as well. This does not close G2 or the
remaining V4 manual review gates.
The root test command serializes Turbo package tasks to avoid the observed shared
Vitest cache startup race. Tests use fake/mocked image and analysis providers.

The [selected-area follow-up](design/selected-area-analysis.md) passes
typecheck/lint/package tests (78 web tests) and three targeted Home/Pro browser
journeys. Redraw, multiple regions, explicit analysis and optional custom startup
requests are implemented. The user explicitly approved paid photo analysis on
2026-11-10; local advice now uses `gpt-5.4-mini` after restarting web and worker.
The production build and source/documentation checks also pass.

The approved [comparison correction, batch 1](design/comparison-batch-1.md) now
shares complete-image side-by-side and full-screen viewing between Home and Pro.
The slider reveals stationary full-size images; incompatible proportions use
side-by-side, and matching proportions do not imply verified camera alignment.
The [batch 2 assessment gate](design/room-assessment-batch-2.md) now checks photo
evidence and qualitative furniture placement before full-room generation, with
latest-photo recovery and atomic refunds. Controlled wider framing and output
verification remain batch 3, pending approval. A follow-up relaxes the photo gate:
recognisable close-ups/partial rooms proceed even with low confidence, hidden floor
or uncertain item fit. Analysis guides compact styling within visible space;
unrelated or genuinely unrecognisable photos still require replacement.
Local paid-provider activation is
approved and configured. Real RESTYLE cannot run unchecked while analysis is
unavailable; known unavailable configuration is rejected before queuing/charging.
Batch 1 passes typecheck/lint/package checks, both targeted Home/Pro browser
journeys and the production build. Its report records fixture and review details.
Batch 2 passes final typecheck/lint/package checks (80 web, 32 shared, 25 AI and
23 worker tests), three browser journeys and the production build. Recovery UI was
reviewed at 375px; three recorded browser accounts/workspaces were cleaned. No
paid API call, real analysis activation or batch 3 work occurred in that batch.
Subsequent activation verified healthy web/database and worker services. Browser
verification was stopped by the Computer Use URL-confidence safeguard, so a live
paid generation has not been verified and G2 fidelity acceptance remains open.
