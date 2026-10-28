# 00 — Product

## One-liner

Upload a room photo, enter its size, and get realistic redesign options plus a cost estimate. Homeowners get ideas within a budget. Designers get a full client workflow from brief to approved proposal.

## Users and modes

| | Home mode | Pro mode |
|---|---|---|
| Who | Homeowners, renters, DIYers | Interior designers, remodelers, small studios |
| Goal | See ideas, stay in budget, decide what to buy | Win clients fast, price accurately, get approvals |
| Pricing basis | Default price table, shown as a rough range | The studio's own rate card, shown as line items |
| Output | Renders, cost range, shopping list, share link | Branded renders, estimate, proposal PDF, client approval |
| Plan | Free tier, then low monthly plan | Monthly plan with credit cap |

A user picks a mode at onboarding. Mode only changes the UI and defaults. **What a user may do is decided by their plan, checked on the server — never by mode alone.** Users can switch mode in settings.

## Feature matrix

| Feature | Home | Pro | Phase |
|---|---|---|---|
| Email + Google sign-in | ✓ | ✓ | V1 |
| Upload room photo(s) | ✓ | ✓ | V2 |
| Room dimensions + openings (doors/windows) | ✓ | ✓ | V2 |
| Style renders (4 variations) | ✓ | ✓ | V2 |
| Edit by chat ("make the walls sage green") | ✓ | ✓ | V2 |
| Favorites, download | ✓ | ✓ | V2 |
| Style quiz | ✓ | – | V3 |
| Keep list ("I keep my sofa") | ✓ | ✓ | V3 |
| Budget input + what-to-change-first | ✓ | – | V3 |
| Renter mode (no-construction changes only) | ✓ | – | V3 |
| Rough cost range (default price table) | ✓ | – | V3 |
| Shopping list (item types and sizes) | ✓ | – | V3 |
| Before/after slider | ✓ | ✓ | V3 |
| Share link with votes | ✓ | – | V3 |
| Watermark on free tier | ✓ | – | V3 |
| Studio profile (logo, colors, currency, units) | – | ✓ | V4 |
| Clients | – | ✓ | V4 |
| Client brief link (no login for client) | – | ✓ | V4 |
| Rate card editor (+ CSV import) | – | ✓ | V4 |
| Estimate builder (auto from room, editable lines) | – | ✓ | V4 |
| Proposal builder + branded PDF | – | ✓ | V4 |
| Client approval page (pick option, comment, approve) | – | ✓ | V4 |
| Revision history (versions) | – | ✓ | V4 |
| Plans, checkout, credit grants | ✓ | ✓ | V5 |

## Principles

1. **Renders are concept visuals.** Dimensions and prices come only from what the user entered, never from the picture.
2. **One engine, two skins.** Anything both modes need is built once in the shared core.
3. **Designers own their prices.** There is no built-in market price data for Pro mode.
4. **Credits protect margin.** Every render costs credits. No unlimited plans. A daily spend guard protects against runaway cost.
5. **Mobile first.** Many homeowners and clients will use a phone.
6. **Plain language.** No design jargon in Home mode.

## Non-goals (do NOT build)

- Automatic furniture placement / layout engine
- Real product catalog, retailer feeds, or scraping
- 3D or video walkthroughs
- Invoicing, payments between designer and client, contractor marketplace
- Native mobile apps
- Team seats and roles beyond a single owner (schema is ready; UI is not)
- Floor plan drawing tools

## Private alpha success metrics

- 10 designers or remodelers complete the brief → proposal flow.
- 3 of them say they would pay, and 1 pays.
- Render success rate ≥ 95% and median render time ≤ 60 seconds.
- Measured gross margin per paid plan ≥ 60% after provider cost and payment fees.

## Glossary

- **Workspace** — owner of all data. Every user has a personal workspace. Pro users convert it to a studio workspace.
- **Project** — one client job or one home redesign. Contains rooms.
- **Room** — photo(s) + dimensions + openings.
- **Render job** — one request to the AI (restyle or edit) producing N variations.
- **Estimate** — priced line items calculated from room dimensions and a rate card.
- **Proposal** — client-facing document: chosen renders + estimate + terms. Has a public approval link.
- **Credits** — usage currency spent on render jobs.
