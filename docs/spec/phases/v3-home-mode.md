# V3 — Home Mode

**Goal:** a homeowner or renter gets a guided, mobile-friendly experience: pick a style, set a budget, redesign a room, see a rough cost range and shopping list, compare before/after, and share results for votes. Free tier is limited and watermarked.

**Read first:** `AGENT.md`, `00-product.md`, `04-ai-pipeline.md`, `05-estimate-engine.md`.

## 1. Guided new-project flow (`/app/new`)

A step-by-step wizard, one question per screen, progress indicator, back button, state kept if the user refreshes.

1. [ ] Upload photo(s) (reuse V2 component).
2. [ ] Room type and dimensions (simple inputs, with a "don't know exactly? use a typical size" helper per room type; flag the estimate as rougher when a typical size is used).
3. [ ] Keep list: chips ("sofa", "flooring", "curtains", "bed", "cabinets", custom text up to 10 items).
4. [ ] Renter mode toggle with one-line explanation.
5. [ ] Budget (optional): amount in the workspace currency.
6. [ ] Style quiz: show 6 image pairs; the user picks the one they like each time; map picks to a top-3 style recommendation using `styles.ts` tags. Allow "skip, I'll choose myself".
7. [ ] Confirm screen: shows credit cost and a "Generate" button.

**Acceptance:** completing the wizard creates a project, room, assets and a render job with the keep list, renter flag and recommended style applied to the prompt.

## 2. Results screen

- [ ] 4 variations in a grid with favorite and download.
- [ ] **Before/after slider** (accessible: keyboard and touch; labels "Before" and "After").
- [ ] Chat edit (from V2) with example chips: "warmer lighting", "add plants", "change rug", "lighter walls".
- [ ] "Try another style" button reusing the same room (new job, credits shown).
- [ ] Compare two favorites side by side.

## 3. Cost range and what-to-change-first

- [ ] Seed default rate cards per currency (USD, EUR, GBP, INR, AED, AUD, CAD) with clearly labelled **illustrative** numbers (see `05-estimate-engine.md`).
- [ ] `packages/shared/src/default-scope.ts`: scope per room type and per renter mode.
- [ ] Server service `getRoughEstimate(ctx, roomId, selectedStyle?)` uses `computeEstimate` with `rangeBps = 2000` and persists an `Estimate` (version 1) for the project.
- [ ] UI: "Estimated cost range: X – Y" with a short breakdown by category (paint, flooring, lighting, furniture…) and the note "Rough range. Actual prices vary by location and provider."
- [ ] **What to change first:** if a budget is set, rank scope categories by impact-per-cost using a static impact weight table (config), and show the top 3 that fit the budget. Show "over budget" clearly with a suggestion to switch to renter mode or reduce scope.
- [ ] Let the user toggle categories on or off and see the range update instantly (client calls the same pure `computeEstimate` via a shared import; no duplicated logic).

## 4. Shopping list (item types and sizes, no product links)

- [ ] `packages/shared/src/room-needs.ts`: per room type, a static list of needs with typical size guidance derived from room dimensions (e.g. living room: sofa 2.0–2.4 m for rooms with width ≥ 3.5 m; coffee table; TV unit; rug size by floor area; curtains by window width).
- [ ] Shopping list screen: checkable items with size guidance and a suggested budget share. "Copy list" and "Print/save as PDF" via the browser print stylesheet.
- [ ] No retailer links or scraping (see non-goals).

## 5. Share link with votes

- [ ] Owner can create a share link for a project (`shareToken`, 192-bit). Revoke and regenerate supported.
- [ ] `/share/[token]`: read-only gallery of favorited renders (or all, owner's choice), before/after, optional display name for voters, one vote per option per browser (cookie) plus IP rate limit. No session needed.
- [ ] Votes increment `RenderOutput.votes`. Owner sees vote counts.
- [ ] Page is `noindex`, no workspace details, no listing of other projects.

## 6. Free tier and watermark

- [ ] Workspaces with no active paid plan are "free". Renders served to free workspaces (preview and download) get a visible watermark applied by sharp at delivery time. Originals stay clean in storage.
- [ ] `getPlanState(ctx)` helper (returns `FREE` until V5 plans exist).
- [ ] Out of credits → modal "Get more credits" (stub link to `/pricing` until V5).

## 7. Polish

- [ ] Empty, loading and error states on every new screen.
- [ ] Mobile-first at 375px; large tap targets; no horizontal scroll.
- [ ] Accessibility pass: labels, focus order, contrast, alt text for renders ("AI-generated {style} {room type} concept").
- [ ] Analytics events (privacy-friendly; no image data): `wizard_started`, `wizard_completed`, `render_requested`, `render_succeeded`, `estimate_viewed`, `share_created`.

## 8. Tests

- [ ] Unit: scope selection by room type and renter mode; "what to change first" ranking; room-needs sizing rules.
- [ ] Integration: `getRoughEstimate` persists a version and respects workspace scoping.
- [ ] Share-link tests: token lookup, revoked token returns 404, votes rate-limited, no data leakage.
- [ ] Watermark test: free workspace output differs from stored original; paid does not.
- [ ] Playwright: full wizard → results → estimate → share link in an incognito context → vote.

## Definition of Done for V3

- [ ] All boxes ticked; CI green.
- [ ] A non-technical person can finish the wizard on a phone without help.
- [ ] Estimate range updates instantly when toggling categories.
- [ ] Summary for the human.

**Out of scope for V3:** Pro features, payments, product links.
