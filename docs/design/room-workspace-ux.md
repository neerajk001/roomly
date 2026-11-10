# Room workspace UX correction

The completed feature batches exposed too many unrelated controls in one scrolling
room page. User screenshots showed a large inline editor, selection sliders far
from its image, repeated cost summaries and setup forms competing with results.

- [x] Separate room sections and deliver a contained Home/Pro editor; verify feature preservation, focus, selection geometry, desktop/mobile layouts and commit.

Designs, Costs and Room setup remain clearly accessible. Editing gets its own
modal workspace with a fitted canvas and persistent actions; suggestions live in
its Ideas view. No generation, billing, model or credit behavior changes.

## Implementation

- Accessible room tabs preserve their mounted content/state while displaying only
  the active section. A room without photos opens setup first; Designs explains
  the upload requirement. Photos, measurements and the brief are grouped in setup.
- Both Home cost summary/priorities and detailed scope controls moved to Costs;
  Pro's rate-card estimate entry lives there too. Shopping/share links remain clear.
- Existing Home/Pro edit buttons and Explore suggestions open one shared Radix
  modal. The background is inert and scroll-locked, Escape/back closes safely,
  opener focus returns, and closing keeps source-specific text/area drafts.
- The full source image is fitted inside a bounded canvas. The selection wrapper
  follows the rendered image exactly, without letterbox padding in its coordinates.
  On desktop the inspector sits alongside it; on mobile the image remains above
  independently scrolling controls. Apply/cancel and credit cost remain visible.
- The inspector groups whole-image/area/object scope, Your change / Ideas tabs,
  and optional edge adjustment. Suggestions use a single column in the inspector.
  There is no extra full-size image/thumbnail repeated above the canvas.
- All existing credit charges, request confirmation, polling, provider guards,
  masking and edit-source/version metadata remain unchanged. No data migration,
  new dependency or generated image asset was introduced.
- The Next.js development status badge is hidden so it cannot overlap the mobile
  Apply action. Compile/runtime errors are still surfaced; production behavior is
  unchanged by this development-only setting.

## Verification — 2026-11-10

Required typecheck, lint and all package tests pass. The final sequential six-test
browser suite passes, including Home/Pro edits, exact image/overlay alignment,
Escape/focus restoration, per-concept drafts, retained setup/cost controls and
375px editor containment. Desktop/mobile screenshots were reviewed. An earlier
run timed out awaiting initial generation while build/package checks overlapped;
it was not counted as passing. The final run used an isolated fake-provider queue
and no concurrent build/tests. Five recorded test accounts were cleaned up.
The production build passes. Existing G2 and V4 manual review gates remain open.

### API references

- Installed Next.js server/client component guidance.
- [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog)
- [Radix Tabs](https://www.radix-ui.com/primitives/docs/components/tabs)
