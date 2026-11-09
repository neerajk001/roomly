# Home mode — current implementation summary

Updated 2026-11-09. See [project status](project-status.md) for the combined
Home/Pro implementation and open review gates. Test evidence for each guided-design
delivery is retained in its [batch report](design/README.md).

## What works

- The seven-step /app/new flow covers photos, room details/typical-size help,
  keep-items, renter restrictions, design tradition and room-specific looks,
  optional budget, then review and extra notes. It uses 25 distinct photographic
  style atlases rather than repeated placeholder photos. Budget tier and custom
  amount are optional. Validated non-file preferences survive refresh.
- Every selected style maps to an output. Contrasting auto-picks and creative
  directions make alternatives more distinct; heuristic near-copy detection can
  replace one slot once, with honest remaining-similarity feedback.
- Results include remembered concept selection, favorites, download, lightbox,
  before/after comparison, style changes and concept-family version history.
  The editor identifies its exact source; text drafts and area targets remain
  separate per image while the page is open.
- On-demand suggestions can prefill an edit, without generating automatically.
  Optional object/area selection supports approximate detected boxes or manual
  pointer/touch/keyboard controls. Masked edits preserve the stored source outside
  the reviewed rectangle and retain keep-items/renter/notes/budget context.
- Estimate ranges, category scope, priorities and shopping lists use entered room
  measurements and the shared estimate engine, not dimensions or prices from pixels.
- Share links support favorites/all outputs, regeneration/revocation and anonymous
  voting. Free-workspace watermarks are applied at delivery, preserving originals.
- Submission errors retain the draft and do not automatically retry mutations.
  Status polling is bounded/cancellable with a read-only recovery action. Room
  navigation resets client editing state. Core UI works at 375px width.

## Limits and remaining review

- Default demo suggestions do not analyze images or detect objects. Real vision
  requires explicit provider/model configuration and G2 manual quality review.
- Similarity checks are heuristic. Rectangles are not precise segmentation;
  masked edits can leave seams. No freehand brush, retailer catalog, layout engine,
  exact-price claim or construction guarantee is implemented.
- Files must be reselected after wizard refresh. Result edit text/area drafts are
  in memory; only concept selection persists across result-page reloads.
- Real-provider fidelity, CI/release evidence and manual usability timing remain
  the open phase review gates. Billing is excluded from this work.
