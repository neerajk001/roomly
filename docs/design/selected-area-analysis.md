# Selected-area editing and analysis

One integrated V4 maintenance task; the following are its acceptance checks.

- [x] Support redrawing/removing up to five areas with legacy single-area compatibility.
- [x] Mask/composite the selected regions without changing the gaps or outside pixels.
- [x] Add explicit selection-scoped analysis and user-chosen suggestion drafts.
- [x] Add optional custom input alongside the initial room checklist.
- [x] Verify authorization, cache/spend limits, masks, Home/Pro UX and update docs/commit.

V4 maintenance. Analysis is a read/suggestion operation, not automatic image
generation or an assertion that the AI knows the user's intention. Real analysis
uses the configured advice provider/model and existing spend guard.
Demo analysis stays explicitly labelled. Tests use fake/mocked providers only.

## Behavior

- Mark an area starts a keyboard-adjustable rectangle. Dragging again replaces
  the active area immediately; Add area starts another numbered region. Choose
  an area number to redraw it, adjust its edges, remove it, or clear all areas.
- Up to five regions are accepted. Each must be at least 1% wide/high. Their
  conservative summed coverage must stay at or below 80% (overlap counts twice).
  Old jobs containing only `region` continue to work.
- Analyse selected areas is disabled without a target. It accepts an empty
  instruction, switches to Ideas, and sends the authorized full-room thumbnail
  and ordered close-ups to the configured advice provider. An instruction, if
  present, is an optional preference hint. No image edit or credit debit occurs.
- Real advice describes possible intentions rather than asserting what the user
  meant. Users can choose an idea to fill their command, modify it or write their
  own command, then explicitly Apply. Selecting an idea alone does not generate.
- Selected-analysis results are separate from whole-image advice/object detection.
  Changing geometry hides stale results. Server caching includes output, ordered
  coordinates and hint, with six variants per output and two attempts per entry.
  Spend reservations scale by the full-image-plus-crop count and retain the shared
  daily guard, row locking and workspace rate limit. Close-ups are transient.
- The edit worker masks each selected rectangle and composites those patches onto
  the original. Gaps and outside pixels remain unchanged in lossless stored PNGs.
  Rectangles can include adjacent background and show seams; these are not
  semantic object segmentation or a freehand brush.
- Home and Pro quick-start have one voluntary 300-character custom request beside
  room-specific items. It is retained in the non-file local draft, saved to project
  notes and passed to generation and inherited edit context. Blank remains valid.

No new dependency, environment variable, migration, image asset, billing behavior
or deployment is included. After the user delegated the model choice,
`gpt-5.4-mini` was selected: it supports vision and structured output and fits
this bounded suggestion task. Activation remains pending explicit approval after
automatic review rejected enabling paid image egress. Local advice stays demo.
Automated tests retain fake/mocked providers; model selection does not certify
real-image fidelity. Existing G2/V4
manual review gates remain open.

Pending local activation, after explicit approval:

```dotenv
ADVICE_PROVIDER=openai
OPENAI_ADVICE_MODEL=gpt-5.4-mini
```

This sends the requested room image and selected crops to OpenAI and incurs API
costs under the existing spend guard. Existing image-generation settings stay as
configured. The running web server must reload its environment after activation.

## Verification — 2026-11-10

- Required typecheck, lint and package tests pass across all 11 packages,
  including 78 web, 28 shared, 22 AI, 20 storage and 17 worker tests.
- Tests verify legacy targets, multi-region bounds, exact mask/composite pixels
  across two separate regions and their protected gap, crop order/dimensions,
  target authorization, source lineage, cache separation, bounded variants,
  concurrency, spend reservations and custom request persistence.
- All three targeted Playwright journeys pass: Home render/edit/history, Pro
  brief/render/estimate/proposal/approval, and quick-start/share/anonymous voting.
  They cover repeated redraw without rearming, two-area edits, instruction-free
  analysis, choosing a suggestion without generating, stale-idea removal, five
  areas/max count/clear in Pro, and saved custom startup notes.
- Desktop and 375px screenshots were reviewed. The full image and pinned Apply/
  Analyse actions remain visible, and selection/instruction controls scroll in
  their own panel. These are fake-provider layouts, not real-model fidelity proof.
- The parent process, web server and isolated `pgboss_e2e` worker explicitly use
  fake providers. Three recorded disposable browser accounts/workspaces were
  cleaned. Existing user rooms/photos/designs were retained. No paid API call ran.
- At delivery, real-provider activation was blocked by automatic approval review;
  no local runtime setting was changed in that task. On 2026-11-10 the user then
  explicitly approved photo egress and paid analysis. Local advice now uses
  `gpt-5.4-mini`; web/worker were restarted and health checks pass. A live paid
  generation remains unverified after the browser helper's URL-confidence stop.
- Production build passes. Source formatting, Markdown links, environment wiring
  and whitespace checks pass. No deployment or additional phase was started.
