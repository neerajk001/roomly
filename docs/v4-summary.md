# Pro mode — current implementation summary

Updated 2026-11-10. This replaces the early V4 snapshot whose gaps were completed
in later core-flow batches. See [project status](project-status.md) and the unchanged
[V4 review checklist](spec/phases/v4-pro-mode.md) for outstanding acceptance gates.

## What works

- [Application simplification](design/friction-fixes.md): combined client/project/
  room/photo entry, optional detailed setup, room-aware generation choices, grouped
  advanced controls and one selected-concept toolbar. Rooms and designs share one
  project tab; rates/settings move to the profile menu. Professional capabilities
  and explicit proposal sending/approval remain available.

- Studio profile: name, brand color, units, currency, contacts, terms and validated
  logo upload. Pro results omit the free-workspace platform watermark.
- Clients: scoped CRUD/search/soft deletion, linked projects and brief links.
- Public briefs: branded token link, expiration/rate limits/honeypot, multiple
  photo uploads and validated answers. Submission creates the project/room/assets;
  the designer can use those photos for generation.
- Rate cards: editable starter placeholders, grouped/reorderable responsive lines,
  units and metric/imperial display, exact integer money parsing, multiple cards and
  default selection, CSV import/export with row errors and no partial writes.
- Estimates: measurements/opening deductions through the shared engine, editable
  scope/lines, safe totals, concurrent version allocation, saved-version reopening,
  preservation of sent estimates and latest-per-room project summaries.
- Proposals: editable drafts with stale-write checks; explicit revisions; frozen
  sent content/branding/estimate/options; image-bearing branded PDFs generated on
  demand in the web app; public preview/download/approval/change requests; durable
  notification outbox handled by the worker with idempotent delivery.
- Studio dashboard/project tabs expose combined rooms/designs, estimates, proposals and
  activity. Client approval closes the proposal with the chosen option/name/time.
- Shared guided-design batches provide selected-style/direction metadata, contrast
  and bounded similarity retry, selected-concept suggestions, independent text and
  area targets, protected masked edits and concept-family history in Pro too.
- Pro rooms now separate Designs, Costs and Room setup. The shared modal editor
  keeps the source canvas, selection tools, text changes and Apply action together
  instead of appending a large editor and setup forms below the result gallery.

## Verification and open review

Automated coverage includes tenant isolation, rate-card validation, estimate math
and versioning, proposal state transitions/snapshots/notifications, PDF branding,
estimate text and concept pages. Playwright covers designer → public uploaded brief
→ generation → estimate → PDF → anonymous approval, including mobile area controls.

These checks use fake/mocked providers. The V4 Definition of Done remains open for
real-provider manual fidelity/workflow testing, unaided completion timing and CI
evidence. There is no claim that the application is production-approved. Billing,
invoicing, team seats and contractor handoff remain outside this delivery.
