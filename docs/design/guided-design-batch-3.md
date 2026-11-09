# Guided design — batch 3

Completed batch report. For the current combined implementation and open review
items, see [project status](../project-status.md) and the [batch index](README.md).

- [x] Explicit, remembered concept selection in Home and Pro.
- [x] Comparison, saved actions and chat consistently target that concept.
- [x] Image-specific recommendation provider, validated output and safe caching.
- [x] Suggestions can prefill an edit without automatically generating images.
- [x] Edit lineage, inherited context and concept-specific change history.
- [x] Tenant isolation, fake-provider tests, browser/mobile checks and commit.

Object detection, object selection and masked edits were delivered in batch 4. No new style
preview imagery, billing feature or default production model selection is included.

## Built

Both result views now have an explicit selection. Comparison, saving, suggestions
and edit actions use that output. The chosen job/output is remembered in validated
local browser storage; edit drafts are kept separately per image while the page
is open. Switching images closes the composer without losing its draft.

The composer shows a thumbnail and label for its exact target. New edit jobs keep
the selected source output ID, style, mood, budget direction and original notes.
Prompts also retain keep-items and renter restrictions. Version history groups
only the selected concept's original and edits; unrelated concepts stay separate.
Legacy edit lineage is reconstructed from source asset IDs where available.

Suggestions are requested only on demand and cached by immutable output ID. The
OpenAI adapter sends a server-loaded thumbnail and design context to the Responses
API with structured output, `store: false`, a timeout and automatic retries disabled.
Zod validates model responses and saved data. Up to three ideas include a visible
observation, reason and edit instruction. “Use this idea” only fills the composer;
the existing Apply change action and credit charge still require a user click.

Concurrent requests claim one cache entry under a row lock. Failed requests have
at most two attempts per output/provider. Workspace rate limits and the shared
daily spend guard apply. Advice reserves a conservative integer-micros allowance,
including failed calls; per-day metadata makes advice on old concepts count on
the day it is requested. Render/replacement guards include this spend too. The
allowance is accounting protection, not a provider-enforced cost ceiling or exact
usage pricing. In-flight image jobs retain the existing conservative guard limits.

Estimates remain based on measurements and scope, with copy clarifying that they
are shared across concepts. Advice does not infer dimensions, exact prices,
retailer availability, or structural safety from an image.

## Configuration and review boundary

- Default `ADVICE_PROVIDER=fake` is explicitly labelled **Demo suggestions** and
  says that image analysis is disabled. It uses design preferences, not pixels.
- To enable real image-aware suggestions, set `ADVICE_PROVIDER=openai`, the server
  `OPENAI_API_KEY`, and an explicitly selected `OPENAI_ADVICE_MODEL` supporting
  image input and structured output. No model was chosen or paid call made here.
- `ADVICE_CALL_BUDGET_MICROS` defaults to 250000 USD micros per attempted advice
  call. Configure this conservative allowance against the chosen model's pricing.
  Enabling the real provider with missing model/key configuration fails validation.
- New variables are in `.env.example` and the environment schema. No dependencies,
  migrations, preview images or billing functionality were added.
- Real-model quality/fidelity remains the existing G2 review. Object detection,
  selection and masked edits are documented in completed batch 4.

## Verification

Typecheck, lint and tests pass across all 11 packages, including 64 web tests.
New coverage checks selected-image context, authorization before download, cached
and concurrent requests, failed-attempt limits, spend accounting on older jobs,
edit-source inheritance, response validation and concept-family history.

All six browser journeys passed across the initial suite and corrected focused
rerun. The final 375px refinement rerun also passes after moving suggestions near
the gallery and adding editor focus: selection survives reload, drafts stay
separate, the submitted edit targets concept 2, and history excludes concept 1.
Mobile screenshots were reviewed; the test confirms no horizontal overflow.
All generation and advice checks used fake/mocked providers. Test accounts were
cleaned up. Real-provider quality review remains pending; batch 4 is complete.

## Documentation sources

- Installed Next.js server/client-component guide.
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
  and [image inputs](https://developers.openai.com/api/docs/guides/images-vision).
- Prisma ORM v7 raw/JSON query guidance. Advisory locking selects a scalar value
  instead of returning PostgreSQL's unsupported `void` result to the Prisma client.
