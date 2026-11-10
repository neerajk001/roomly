# Room assessment — batch 2

Approved V4 maintenance task. Batch 1 comparison is complete. Wider framing and
post-generation geometry checks remain batch 3, pending approval. Paid-provider
activation remains separate; tests never call a paid API.

- [x] Add validated photo/space and requested-item assessment providers.
- [x] Gate RESTYLE generation, cache queue retries and reserve bounded analysis spend.
- [x] Preserve planning constraints in prompts, stop/refund uncertain jobs and prevent duplicate calls.
- [x] Add Home/Pro checking, planning and actionable recovery states without a new wizard.
- [x] Verify package/browser/build checks, reconcile documentation and commit for review.

Assessment is qualitative AI guidance, not measured room geometry, exact area,
product dimensions or a guarantee of clearance. Supplied measurements are context;
no guessed dimensions are stored. Demo assessments are valid only for fake image
generation and are labelled accordingly. A real job cannot bypass checks with a
demo result. No camera widening or post-render geometry certification is included.

## Delivered behavior

- An automatic RESTYLE assessment examines the source photo and stored room type,
  user-supplied millimetre dimensions, kept items, renter constraints, notes and
  requested item categories. It requires floor/boundary evidence, specific fixed
  features and a useful layout plan. Contradictory ready responses are demoted.
- Every requested category needs a unique fit/compact/cannot-fit/uncertain entry
  with qualitative footprint and placement. Missing/invented/duplicate entries
  fail validation. Nothing is allowed to expand the room or change the camera.
  Supplied dimensions reach the generator; no numeric dimensions are guessed.
- Insufficient evidence stops before image generation and requests one clearer,
  wider photo. Infeasible items stop with revised-choice guidance. Home can uncheck
  selected items and update its short request in place; Pro retains its generation
  preferences. Photo setup is accessible from recovery, including repeated use.
- Photo recovery can start a new explicit generation after uploading a better
  source. New RESTYLE requests select the newest confirmed photo in the authorized
  room/workspace. Existing jobs and edited versions retain their own source URL
  in history/comparison. Removed source photos remain available to their history.
- Assessment progress and a compact optional Room planning disclosure appear in
  Home/Pro. Demo planning is labelled as unanalysed fake-image behavior. No new
  questionnaire or required measurement step is added. Updated generation notes
  persist into later Home regeneration and source-inherited edits.
- Real RESTYLE cannot use a demo assessor. With real analysis unavailable, it
  is rejected before queuing/charging when the configuration is known to be
  unavailable; worker-side failures stop/refund. Existing advice configuration/model is reused; activation is
  still pending explicit permission for image egress and paid API usage.
- Per-job assessments are cached by source/context/model; image queue retries
  reuse matching results. Failed/interrupted checks are not automatically called
  again. The worker atomically claims a queued job, preventing duplicate execution.
- Real attempts reserve the existing analysis allowance under the shared daily
  spend lock, including failures. Expected image spend is included in headroom;
  cached retries recheck it. Provider I/O stays outside transactions. Assessment
  metadata/spend survives diversity updates. Failure/refund commits atomically.
- Generation actions use a workspace limit of 30 requests per 10 minutes. Tests
  explicitly use fake providers; browser signups receive 12 test credits. This is
  test configuration only; the application signup grant is unchanged.

No new dependency, environment variable, migration, price formula, billing flow
or model choice is included. Full-room geometry and furniture fit are still AI
guidance, not verified dimensions or a packing solver. Only the selected primary
photo is assessed; multi-view/wider framing and output checks remain batch 3.

## Verification — 2026-11-10

- Final typecheck/lint/package tests pass across all 11 packages: 80 web, 32 shared,
  25 AI and 23 worker tests, alongside existing credit/estimate/storage/PDF suites.
  The request-time real-provider guard is tested to reject before tenant queries,
  credit charges or queueing. Production build passes (1m50s). Formatting, Markdown
  links, environment wiring and whitespace checks pass.

- Required package checks cover the new structured provider/validation, complete
  item coverage, low-confidence demotion, infeasible furniture, workspace/source
  authorization, cached/stale retries, concurrency, spend headroom and model refusals.
- Worker integration proves blocked jobs make no image-generation call, publish
  no outputs and refund once. Duplicate deliveries execute once. Existing image
  retries reuse planning; source/mask/history behavior remains covered.
- Three browser journeys pass: full Home render/edit/history, Pro brief-to-client
  approval, and the new assessment-recovery flow. The recovery case injects terminal
  photo/item failures into status reads to test UI, while actual no-call/refund
  behavior is verified in worker integration tests.
- Recovery coverage uploads a new confirmed photo, verifies repeated navigation
  to setup, revises selected furniture and notes at 375px, confirms another
  generation retains the revised request/latest source, and verifies older design
  comparisons still use their original input. The mobile recovery screenshot was
  reviewed. Demo planning remains explicitly labelled.
- Three recorded disposable browser accounts/workspaces were cleaned. User data
  remains intact. Browser/unit workers use fake/mocked providers; no paid API call
  or real-model fidelity certification occurred. Explicit real-provider activation
  and G2/V4 manual review remain open.

Batch 2 stops for review after checks/build/documentation/commit. Batch 3 has not
started. Real generation must remain paused until the required paid-analysis
activation is explicitly approved and web/worker processes are restarted.
