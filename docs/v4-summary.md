# V4 — Pro Mode: summary for review

## What works
- **Studio profile** (`/studio/settings`): name, brand colour, currency, units, contact email/phone,
  default proposal terms, logo upload (PNG/JPEG/WebP ≤2 MB, kind=LOGO, EXIF stripped).
- **Clients**: CRUD with search + soft delete, detail page with projects, brief-link count, attach a
  client when creating a studio project.
- **Brief links**: per-client links with expiry, copy, status; public `/brief/[token]` with branded
  header, questions, style picks, budget/timeline, up to 8 token-scoped photo uploads, honeypot and
  rate limits; submission creates project + room + assets + `BriefSubmission`, closes the link and
  emails the designer. Verified end-to-end with a debug client.
- **Rate cards**: seeded "Starter rates (edit me)" card, list + editor (name, markup/tax %, item
  label/category/unit/price, add/remove), all-or-nothing validation, CSV export and import with
  row-level errors.
- **Estimate builder** (`room → Build estimate`, studio): auto-fill from scope + default card,
  editable lines, live totals via `recompute`, save creates versions, history shown.
- **Proposals**: builder with title/intro/terms/expiry, estimate version, up to 4 pinned favorite
  renders with captions; send → SENT + client email with public link; **PDF** generated on demand
  with @react-pdf/renderer and stored in S3; Proposals panel shows status, comments, PDF state.
- **Public approval** `/p/[token]`: branded, noindex/no-referrer, options gallery, estimate
  accordion, terms, PDF download; first view → VIEWED; approve records name/time/option and closes;
  request changes records a client comment + CHANGES_REQUESTED; expired/invalid tokens handled;
  IP/token rate limits.
- **Dashboard**: `/studio` shows proposal pipeline counts (Draft/Sent/Viewed/Approved/Changes).
- **Tests**: 24 web tests incl. proposal state machine (double-send, invalid option, approved lock,
  expired rejection, comments) and CSV parsing; typecheck/lint/build green.

## Gaps / deviations (logged in DECISIONS.md)
- PDF is generated on demand in the web app (not a worker job) and contains text + estimate only —
  option thumbnails are not embedded.
- Imperial rate-card display, multi-room estimate summary totals, and an explicit read-only lock on
  estimates referenced by sent proposals are still open (new versions are inherently immutable).
- No PDF snapshot test and no Playwright designer→brief→estimate→send→approval workflow yet.
- CI on GitHub still unverified (no remote). G2 fidelity still needs 5 photos.
