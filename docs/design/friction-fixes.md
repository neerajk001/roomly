# Application simplification implementation

- [x] Consolidate Home navigation/library and direct room entry; reduce onboarding and header noise.
- [x] Simplify selected-design actions, sharing, costs and Saved/Inspiration affordances.
- [x] Consolidate Pro entry and progressively reveal professional details; simplify marketing.
- [x] Verify core journeys, mobile/keyboard access, document changes and commit.

One integrated V4 maintenance correction following the approved application audit.
Billing and production/model decision gates remain excluded. Preserve existing
features through contextual actions and optional details rather than deletion.

## Implemented behavior

- Home and the legacy spaces URL share one My rooms library. Single-room cards
  open the room; multi-room management stays available from the room workspace.
  Mobile has two primary links. Account settings, help, mode switching and studio
  configuration are grouped in one profile menu.
- Onboarding has concise role choices and one Continue submission. Home retains
  automatic currency/units defaults; Pro retains studio preferences. An explicit
  professional signup intent is retained through email/Google signup. Creation
  follows the active experience: Home New design stays Home even for a Pro account;
  the detailed Pro wizard stays inside the studio and returns to its studio room.
- Home and Pro concept cards select an image. One selected-design toolbar holds
  edit/download/full-view actions (and Pro proposal pinning). Ideas, versions and
  before/after comparison are secondary. Full-view uses an accessible modal with
  Escape and focus return. Regeneration stays explicit with visible credit costs.
  Mobile concepts use a swipeable row and a compact results heading, keeping
  selected-design actions near the choices instead of after three stacked images.
- Room sharing opens an accessible modal in context. Public scope is explicit;
  opening it does not create a link. Regenerate/revoke are under Manage public
  link. Project sharing remains available for existing links.
- Costs has one interactive range/priorities panel. Category details and the
  Planning checklist live there; the duplicate summary is removed from the page.
- Saved has honest room/style filters and output-specific assigned styles.
  Nonfunctional decorative action icons are removed from the library/Inspiration.
  Inspiration stays available from optional style exploration.
- The Pro main entry combines client, project name, room/photo and generation.
  The detailed wizard and empty/multi-room setup remain optional. Atomic project/
  first-room creation lives in a service, validates boundaries and scopes client
  lookups to the authenticated workspace.
- Pro generation uses the room-item catalog shared with Home. Count, quality and
  instructions remain under optional generation settings. Brief preferences,
  estimate history, CSV tools and proposal details are expandable. Rooms/Renders
  share one project tab; Add room stays in that context.
- Object controls are optional; detection is offered with the real advice
  capability. Manual regions and stored targets stay available in demo mode.
- Landing retains paired imagery, examples, audience information, pricing and FAQ.
  Process copy matches quick-start. Repeated banners and unsupported hard-coded
  social-proof metrics are removed. Reusable components/assets remain in the repo.

No dependencies, environment variables, migrations or paid provider calls added.
No change to estimate formulas, credit prices, provider/model choice or billing.

## Verification — 2026-11-10

- Typecheck and lint pass across all 11 packages, without new lint warnings.
  Package tests pass, including 76 web tests and the new combined-creation/client
  isolation check. Existing worker, mask, credit and estimate suites remain green.
- All six browser journeys are verified against the final application code: five
  passed in the final full run; the Home test's remaining assertions for removed
  badges/old history labels were updated, then its complete focused rerun passed.
  No application code changed between those successful browser results.
- Browser coverage includes concise onboarding and profile navigation, Pro quick
  creation and switching back to Home creation, all ten checklists, assigned Saved
  styles, direct room access, explicit sharing scope and anonymous voting, modal
  focus/Escape, selected-image drafts, mask selection, edit lineage and history,
  costs/setup state, estimates, proposals and anonymous client approval.
- Desktop and 375px screenshots were reviewed. Mobile navigation is compact and
  concepts remain accessible in a swipeable row. Tests use isolated fake-provider
  queues; the images demonstrate wiring/layout, not real-model visual fidelity.
- Recorded disposable test accounts/workspaces were cleaned after every browser
  run (five in the final full run and one in the final Home rerun). User data stays
  intact. No billing or live-provider/G2 manual review was included.
- Production build passes. Source formatting, Markdown links, environment wiring
  and whitespace checks pass. Existing G2 and V4 manual acceptance gates remain
  open; no new phase or deployment was attempted.
