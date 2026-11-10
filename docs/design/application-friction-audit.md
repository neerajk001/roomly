# Application friction audit — 2026-11-10

Scope: source review of the current landing, authentication/onboarding, Home,
room generation/results/editor, costs, Saved/Inspiration, sharing, Pro projects,
briefs, estimates, proposals and settings. Includes the desktop/375px screenshots
reviewed during the preceding implementation. This is an expert review, not a
new observed usability study; no completion-time or conversion gains are claimed.
Billing is excluded. These are recommendations; no product behavior was changed.

## Main finding

The recent quick-start removes the initial Home questionnaire, but the surrounding
application still exposes too many destinations, duplicate representations and
administrative controls. Simplification should remove duplicate interfaces and
defer detail until relevant. Preserve the requested room-specific item lists,
editing tools and professional capabilities.

## Priority 1 — remove confusion and extra navigation

| Finding | Recommended cut/change | Evidence |
|---|---|---|
| Home and My spaces both show projects, filters and new-design actions. Home also adds promotional content, activity and saved previews. | Merge into one **My rooms** destination. Show recent rooms and one New design CTA. Use a short empty state only before the first design. | [Home](../../apps/web/src/app/(app)/app/page.tsx), [My spaces](../../apps/web/src/app/(app)/app/spaces/page.tsx) |
| Home cards open a project overview before the user reaches a room. The project page exposes project deletion, room creation and sharing as separate blocks. | Single-room Home cards open the room directly. Keep multi-room organization behind an explicit Manage rooms action. Retain projects internally. | [Project overview](../../apps/web/src/components/projects/project-detail-view.tsx) |
| Header shows both modes continuously; mobile adds a wrapping five-item navigation row. Settings appears in navigation, sidebar footer and avatar. | Compact mobile header; one New design entry; account/settings/help/mode switch in the profile menu. Keep My rooms and Saved as primary Home navigation. | [Shell](../../apps/web/src/components/app/app-shell.tsx), [Navigation](../../apps/web/src/components/app/app-nav.tsx), [Mode switch](../../apps/web/src/components/app/workspace-switcher.tsx) |
| Onboarding says Continue as homeowner/professional on a selection control, then requires a separate Open workspace submission. | Use two concise role choices and one clearly labelled Continue action. Retain Pro setup fields as needed. Home already defaults currency/units: do not reintroduce those questions. | [Active onboarding](../../apps/web/src/components/onboarding/mode-cards.tsx) |
| Results show select, full-view and edit controls on every card, plus selected-concept status, suggestions, comparison and history below. Clicking an image also selects it and opens the viewer. | Make card selection clear; show one action bar for the selected design: Edit, Download, Share. Put Compare and History in explicit views/controls. Keep Generate more secondary with its credit cost clear before submission. | [Home results](../../apps/web/src/components/rooms/home-room-results.tsx) |
| Costs renders a summary range/priorities and then another interactive range/priorities panel. One summary says based on measurements even when defaults may have been used. | Keep one live cost panel with one range, its basis/uncertainty, and expandable categories. Reveal measurements when the user chooses cost planning. Avoid precise-looking unsupported expectations. | [Summary](../../apps/web/src/components/rooms/RoomCostSummary.tsx), [Interactive panel](../../apps/web/src/components/estimates/estimate-panel.tsx) |

## Priority 1 — fix misleading affordances and language

- **Edit brief** links to the project overview, which is not a brief editor.
  Route it to the actual room setup/brief controls or remove this duplicate entry.
  The room already has a Room setup tab.
- Results repeat the same “concept visuals based on your room, style and budget”
  paragraph twice. Budget is no longer part of every Home generation. Remove the
  duplicate and describe only information actually supplied.
- [Workflow guide](../../apps/web/src/components/app/workflow-guide.tsx) still tells
  Home users to choose keep-items and a budget. Remove the persistent guide from
  returning-user dashboards; align first-use guidance with quick-start.
- [Saved](../../apps/web/src/app/(app)/app/saved/page.tsx) labels automatic room
  filters as Dream home / For later collections. For later actually means all
  non-living/non-bedroom rooms. Rooms/Styles views also mostly filter the same
  outputs. Replace these with one saved grid and honest room/style filters.
  Its style label uses the parent job style; use each output's assigned style
  for multi-style generations.
- [Inspiration](../../apps/web/src/app/(app)/app/inspiration/page.tsx) displays
  bookmark and overflow symbols as decorative spans. Remove interactive-looking
  icons without behavior. Keep inspiration reachable inside optional style
  exploration rather than competing with the main room workflow.
- [Object finder](../../apps/web/src/components/renders/ConceptTargetEditor.tsx)
  remains an action in demo mode although demo advice cannot detect objects.
  Show capability-appropriate controls; retain manual area selection. In the
  editor, default to the change input and expose object/area scope when requested.
  Preserve current target visibility, protected-area explanation and Apply cost.

## Priority 2 — simplify professional work without removing it

| Area | Recommended cut/change | Evidence |
|---|---|---|
| Pro creation | The seven-step guided wizard and manual project → room → photo → generate route offer inconsistent setup. Use one New project entry with client, room and photo together; continue into the project. Keep measurements, constraints and budget in editable brief details. | [Wizard](../../apps/web/src/components/wizard/guided-wizard.tsx), [Project form](../../apps/web/src/components/projects/new-project-form.tsx), [Room form](../../apps/web/src/components/projects/room-form.tsx) |
| Pro generation | Style gallery, variation count, draft/final quality, generic staging chips and notes compete in one panel. Default the common request; put count/quality under More options. Replace generic sofa/dining-table staging choices with the room-aware catalog. Retain essential client instructions. | [Generate panel](../../apps/web/src/components/renders/generate-panel.tsx) |
| Client brief | Goals and Notes ask for overlapping free text; style selection, budget, timeline and keep-items appear together. Keep photos, room and one goal input prominent. Group the remainder under optional Preferences and constraints. | [Brief](../../apps/web/src/components/brief/brief-form.tsx) |
| Project navigation | Rooms and Renders represent overlapping browsing; Add a room remains rendered outside all five project tabs. Consolidate room/design browsing; put Add room in that context. Keep Estimates and Proposals distinct; move Activity to a secondary timeline. | [Project tabs](../../apps/web/src/components/projects/project-tabs.tsx) |
| Rates and estimates | Tax, markup, CSV tools, row ordering and version controls are useful but need not dominate ordinary edits. Group rates under Studio setup, collapse import/export and history, expose per-row secondary actions on demand. Keep financial detail and immutable versions available. | [Rates](../../apps/web/src/components/studio/rate-card-editor.tsx), [Estimate](../../apps/web/src/components/studio/estimate-builder.tsx) |
| Proposals | Title, estimate, expiry, intro, terms, images, captions and ordering compete. Prefill from project/studio defaults; lead with selected concepts and estimate; put document details in an expandable section. Keep preview and explicit Send. | [Proposal builder](../../apps/web/src/components/proposals/proposal-builder.tsx) |

## Priority 2 — sharing, planning and marketing

- **Sharing:** [share controls](../../apps/web/src/components/share/share-controls.tsx)
  expose create/update, regenerate, revoke and favorites settings together. Offer
  Share → choose what is public → create/copy link in the room context. Keep link
  management secondary. Never make a design public merely by opening the dialog.
- **Shopping list:** it is currently an illustrative checklist with size guides
  and budget allocations, not a shoppable product catalog. Keep it inside cost
  planning under an honest label such as Planning checklist; defer standalone
  navigation until it delivers enough independent value.
- **Settings:** use one profile entry; separate account settings from studio
  defaults inside it. Keep export/deletion and their safeguards accessible under
  Data controls rather than in daily work.
- **Landing:** the [page](../../apps/web/src/app/(marketing)/page.tsx) repeats CTAs,
  audience feature blocks, social proof and large process mockups. Keep a paired
  before/after hero, a short current process, a few examples, concise audience
  explanation and FAQ. Shorten the remaining repetition. The room-dimensions
  mockup describes the old Home process. Hard-coded 28,500+ and 92% claims need
  supporting evidence or removal; the source alone does not establish validity.

## Keep accessible

Room-specific optional checklists; contrasting concepts; exact edit source and
versions; manual/object editing; visible credit costs; status/retry/error states;
honest concept/cost limitations; public-sharing control; deletion and client
approval safeguards; Pro measurements/rates/tax/estimates/proposals. Removing
duplicate presentation should not silently remove these capabilities.

## Proposed end-to-end paths

- **Home:** My rooms → New design → photo + room + optional item picks → three
  concepts → select one → edit / download / share. Costs and setup remain secondary.
- **Pro:** Projects → New project with client + room/photo → concepts → estimate
  → proposal preview → explicit Send → client approval/change request.

Implement in this order: navigation/direct room entry; results action hierarchy;
misleading/duplicate controls and copy; sharing/costs; Pro consolidation; landing.
Verify mobile, keyboard access, preserved feature access and completion of each
core journey after each implementation batch. No production behavior was changed
as part of this audit.
