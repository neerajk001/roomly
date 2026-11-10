# Comparison correction — batch 1

Approved V4 maintenance task. Generation assessment and wider framing (batches
2–3) are not part of this batch. Paid-provider activation remains unapproved.

- [x] Share a complete-image comparison viewer between Home and Pro.
- [x] Provide large inline/full-screen views, responsive mobile switching and fixed-scale slider clipping.
- [x] Handle loading, missing/failed images, incompatible proportions and keyboard access.
- [x] Verify package/browser/build checks, update documentation and commit for review.

The viewer preserves original proportions and uses full-image URLs. Empty gray
space is intentional when an image does not fill its panel. Matching aspect
ratios alone do not prove matching camera framing; automatic geometric analysis
belongs to later batches. This batch must not claim verified alignment.

## Delivered behavior

- Home and Pro share `RoomComparison` inside their existing comparison disclosure.
  Both full-image signed URLs use contained sizing, unchanged aspect ratios and
  generous gray viewing surfaces; thumbnails and forced cover-cropping are not used.
- Inline images sit side by side on desktop and stack on mobile. Expand comparison
  opens a viewport-sized Radix dialog. At mobile widths, Before/After buttons use
  the entire available canvas for one complete image at a time.
- The slider uses stationary full-canvas layers with `clip-path`. Moving from 0%
  to 100% changes only the revealed area, never image width/height. Native keyboard
  controls and spoken percentage values remain available.
- Overlay is available only after both images load with aspect ratios within 2%.
  Incompatible proportions stay side by side with an explanation. No automatic
  camera-registration claim is made for images with matching proportions.
- Missing photos/concepts have explicit empty copy. Images have loading states,
  individual errors and retry buttons. Full-screen supports Escape, close, focus
  trapping/return and fixed controls without horizontal overflow.
- No new dependency, environment variable, migration, provider activation or paid
  API call is needed. Image generation, geometry checking, room measurements,
  credit pricing and the existing editing workflow are unchanged.

## Verification — 2026-11-10

- Typecheck, lint and package tests pass across all 11 packages (78 web tests).
- Both targeted Playwright journeys pass on the final application code: Home
  generation/edit/history and Pro brief/render/estimate/proposal/client approval.
  Both exercise large side-by-side views, slider endpoints with unchanged image
  bounds, portrait/landscape/mismatched proportions, mobile switching, image-error
  retry, Escape and focus return.
- Browser image fixtures use fresh documents, stable storage identities and
  no-store responses. The initial fixture run reused Chromium's decoded original
  images; the test setup was corrected and both complete journeys rerun successfully.
  No application code changed to work around test caching.
- Desktop and 375px screenshots were reviewed; complete image borders remain
  visible, including portrait images and slider endpoints. Test images verify
  layout/behavior, not real-model design fidelity or camera registration.
- Two recorded test accounts/workspaces were cleaned after each browser run
  (four total). User rooms/photos/designs remain intact. All test processes use
  fake image/advice providers and the isolated queue; no paid API call ran.
- Production build passes. Source formatting, Markdown links, environment wiring
  and whitespace checks pass. No deployment or additional batch was started.

Remaining: generation photo assessment, furniture-fit checks, supported wider
framing and output geometry verification belong to later batches, pending approval. G2/V4
manual review and paid-provider activation remain open. Batch 1 stops for review.
