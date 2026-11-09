# Guided design — batch 4

Completed batch report. See [current project status](../project-status.md) and
the [batch index](README.md) for the combined implementation and later fixes.

- [x] Object/area selection and masked edits in Home and Pro, with validated lineage, fake-provider tests, mobile verification and commit.

This is one integrated task: source selection, coordinates, provider mask and
outside-area preservation must be verified together before release.

Detection supplies approximate rectangles, not pixel-perfect segmentation. Users
review and adjust the rectangle before applying an edit. Manual selection remains
available without the opt-in vision provider. No new preview images, libraries,
migrations, billing feature or production model choice is included.

## Sources checked

- [OpenAI image edits](https://developers.openai.com/api/reference/resources/images/methods/edit)
- [OpenAI image generation and masks](https://developers.openai.com/api/docs/guides/image-generation)
- [Sharp compositing](https://sharp.pixelplumbing.com/api-composite/)

Masks are transparent in the editable area and match the normalized input's
dimensions. Provider masks guide generation; server-side compositing enforces the
protected area. Real-model boundary quality remains the existing G2 manual review.

The worker declares the existing Sharp version as a dev dependency for image tests.
This prevents accidental resolution to an unrelated parent-directory Sharp install
with incompatible native DLLs on Windows. No library or version was introduced.

## Built

- Both result views offer optional object/area editing inside the existing editor.
  Object labels come from the selected concept's on-demand image analysis. Users
  can select a label, review its rectangle, draw another rectangle with a pointer
  or touch, adjust its edges with keyboard controls, or return to whole-image edits.
- Targets are separate per concept, alongside the existing separate text drafts.
  Applying an edit still requires an explicit click and the existing credit charge.
  Loading, empty detection, unavailable analysis and image-error states are visible.
- New vision responses include at most eight validated object bounds. Existing
  cached advice remains valid; if bounds are absent, users can mark an area manually.
  Demo mode clearly states that object detection is disabled and invents no boxes.
  Analysis reuses the existing authorized image fetch, cache, rate limit and spend
  guard. The output token ceiling is 2000 to accommodate bounds and suggestions.
- Integer coordinates are validated at every input/queue boundary. Targeted edits
  are limited to one output, inherit the selected image's original context, and
  store the source output and target in job metadata and concept version history.
- The worker normalizes orientation, builds a same-size transparent PNG mask,
  passes it to the configured image provider, then copies only the returned pixels
  inside the rectangle onto the original source. Stored targeted outputs use PNG
  without resizing or JPEG recompression, preserving protected source pixels.
  Targeted calls use automatic output sizing from the actual image, avoiding stale
  aspect-ratio metadata; the stored output records the original pixel dimensions.

## Review boundary

There is no pixel-perfect object segmentation or freehand mask brush in this batch.
Rectangles can include nearby objects or background, so users must review them.
The provider may move content within the rectangle; compositing protects the rest
of the image but can leave visible seams at the selected edges. These are concept
visuals, not construction instructions or measurements. Real detection accuracy
and generated boundary quality require the existing G2 real-model manual review.
No paid API calls or default model changes were made.

## Verification

- Typecheck and lint pass across all 11 packages. The complete test suite passes
  with sequential package execution (66 web, 17 worker, 21 AI, 25 shared and 19
  storage tests, plus the existing tests in the other packages).
- Bounds validation rejects fractional, reversed, tiny, oversized and out-of-range
  selections. Provider tests check object-bound validation and mask forwarding.
- Mask tests check alpha values, orientation normalization, source dimensions and
  every protected pixel when the provider changes the entire image. The worker
  integration test verifies actual masked dispatch, automatic sizing, stored PNG,
  dimensions and protected/edited pixels. Service tests verify saved target/source
  metadata, inherited context and workspace authorization without credit charges
  on denied access.
- Both Playwright journeys pass: Home drawing and keyboard adjustment, independent
  per-concept targets, exact submitted source/region and concept history; Pro area
  selection/reset at 375px and the existing brief-to-client-approval workflow.
  Mobile screenshots were reviewed and horizontal overflow checks pass.
- All providers were fake/mocked. The two browser-test accounts and workspaces
  were cleaned up. Real detection and boundary quality remain pending G2 review.
