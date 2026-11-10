# Home quick-start and room-specific checklists

- [x] Replace the homeowner questionnaire with one screen and distinct checklists for all ten room types; validate prompt propagation, preserve optional controls and verify/commit.

Home starts with a photo, room type and optional must-haves. No extra-instructions,
measurement, budget or renter questionnaire is required before the first image.
Optional style control remains available; the default generates three contrasting
ideas. Pro now shares this quick-start with optional client/project fields; its
detailed flow remains available under optional setup.

Checklist items mean **include this kind of item**, not preserve an exact object
from the photo. Nothing is preselected. Selecting another room clears the old
picks. Server and worker use the room's stored type when validating item IDs.
No new model, paid API calls, image assets, dependency or application-data migration is included.

## Room coverage

Each room has its own curated list (7–9 choices), including:

| Room | Example choices |
|---|---|
| Living room | Sofa, coffee table, TV unit, accent chair |
| Bedroom | Bed, wardrobe, bedside tables, blackout curtains |
| Kitchen | Countertop organizers, breakfast stools, cabinet styling |
| Bathroom | Vanity mirror, towel storage, bath mat |
| Dining room | Dining table, dining chairs, sideboard |
| Home office | Work desk, ergonomic chair, cable management |
| Kids room | Child's bed, toy storage, play mat, reading nook |
| Balcony | Outdoor chairs, planters, freestanding privacy screen |
| Hallway | Shoe storage, entry bench, coat rack |
| Other | Flexible seating, modular storage, room divider |

The shared catalog is used by the UI, request validation and worker prompt builder.
Only IDs from the authorized room's list are accepted. Curated labels reach every
requested concept; prompts require sensible quantities, clear circulation and
unchanged architecture/services. Edit versions inherit the source preferences
while allowing an explicit edit to replace/remove an item. Legacy jobs without
these preferences continue to work. Existing Pro staging controls remain separate.

The screen retains validated non-file preferences locally, prevents duplicate
submissions and links to the saved room if upload/generation cannot be confirmed.
No file or arbitrary free text is retained in local storage.

Browser checks use a separate `pgboss_e2e` queue schema, with fake providers on
both web and worker. Normal development keeps `QUEUE_SCHEMA=pgboss`; the setting
must match on web and worker. This prevents a real local worker consuming fake
browser-test jobs. The new environment setting is documented and validated.

## Verification — 2026-11-10

- Required typecheck, lint and package tests pass: 75 web, 27 shared, 17 worker
  and 9 environment-schema tests, alongside the existing package suites.
- All six Playwright journeys pass. The Home quick-start checks every list at
  375px, clears picks on room changes, permits no item/style selection, verifies
  kitchen preferences and contrasting styles in the completed job, then favorites,
  shares and votes. Service/worker tests verify prompt text and edit inheritance.
- Desktop and mobile screenshots were reviewed. Fake-provider images verify
  layout/wiring; they do not certify real-model visual quality or G2.
- Five recorded disposable browser accounts/workspaces were cleaned up. User
  projects, photos and generated designs were retained.
- The production build passes. No billing work or real-provider fidelity review
  was included; no new product decision gate was opened.
