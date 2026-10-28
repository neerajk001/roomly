# V3 — Home Mode: summary for review

## What works
- **Guided wizard** `/app/new`: photos → room (+"use typical sizes") → keep-list chips → renter mode →
  optional budget → 6-pair style quiz with tag-based recommendations (or skip) → confirm. Progress
  bar, back button, draft survives refresh; one submit creates the project, room, illustrative rate
  card, persisted estimate, uploads photos, starts a 3-concept draft render and lands on the room.
- **Results**: 3–4 concepts with favorites, download, lightbox, chat edit with example chips,
  before/after slider, "try another style", compare two favorites, history strip, disclaimer.
- **Cost range**: illustrative ±20% range from the pure estimate engine; category toggles recompute
  instantly client-side; "what to change first" ranking with budget fit/over; shopping list
  (checkable, copy, print) with sizes derived from the room.
- **Share & votes**: share link (favorites-only or all), copy/regenerate/revoke, public
  `/share/[token]` gallery (no login, noindex, no-referrer), one vote per image per browser +
  IP/token rate limit, owner sees counts.
- **Free tier**: free workspaces get a watermark applied at delivery (preview + download); stored
  originals stay clean; `/pricing` stub and a "get more credits" dialog.
- **Analytics**: privacy-friendly beacon events (`wizard_started/completed`, `render_requested/succeeded`,
  `estimate_viewed`, `share_created`).
- **Tests**: 15 estimate/shared unit tests, 15 web integration tests (isolation, rooms, estimates,
  share), 9 storage tests (images + watermark), worker tests; 5 Playwright E2E including
  wizard → render → favorite → share link → anonymous vote. typecheck/lint/test/test:e2e/build green.

## Not done / caveats
- CI on GitHub still unverified (no remote).
- G2 fidelity report still needs 5 real photos in `fixtures/rooms/`.
- Polling and analytics are simple implementations; rate limit is in-memory (single process) until V6.
- Style quiz uses palette swatches instead of style photos (artwork pending).
- Chat-edit history is per room (last 10 jobs), not a full audit trail.

## Deviations (all logged in `DECISIONS.md`)
Votes via cookie + in-memory limiter (no votes table), watermark at delivery via route handler,
`shareShowFavorites` column added, wizard persists drafts in localStorage (photos must be re-picked),
"typical size" fallback for estimates, checklist shopping list is client-side only.
