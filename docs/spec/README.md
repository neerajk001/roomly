# RoomDesigner — Build Spec (V1 → Production)

Working title: **RoomDesigner** (decision gate G1 — rename any time).

One product, two modes:
- **Home mode** — homeowners and renters redesign a room from a photo, stay within a budget, and share results.
- **Pro mode** — interior designers and remodelers run client work: brief → renders → estimate from their own rate card → branded proposal → client approval.

Both modes share one engine (upload, room dimensions, AI renders, credits).

## How to use this with an AI coding agent

1. Create the repo `room-designer`.
2. Copy this folder to `docs/spec/` in the repo.
3. Copy `AGENT.md` to the repo root as `AGENTS.md` (also as `CLAUDE.md` if you use Claude Code).
4. Start the agent with:

   > Read `AGENTS.md` and `docs/spec/README.md`. Then execute phase V1 from `docs/spec/phases/v1-foundation.md`. Follow the execution protocol in `AGENTS.md`. Stop at the end of the phase and wait for my review.

5. Review, run, and commit after each phase. Then tell the agent to start the next phase.

## Files

| File | Purpose |
|---|---|
| `AGENT.md` | Rules the agent must follow (protocol, hard rules, definition of done) |
| `00-product.md` | Users, modes, feature matrix, principles, non-goals |
| `01-architecture.md` | Stack, monorepo layout, package boundaries, env vars, local dev |
| `02-database.md` | Full Prisma schema and data rules |
| `03-auth-and-workspaces.md` | Better Auth setup, workspaces, authorization, public token links |
| `04-ai-pipeline.md` | Image provider abstraction, prompts, render job lifecycle, credits, spend guard |
| `05-estimate-engine.md` | Pure estimate logic, formulas, golden test cases |
| `phases/v1-foundation.md` | Repo, tooling, DB, auth, onboarding, CI |
| `phases/v2-core-engine.md` | Uploads, projects/rooms, render pipeline, credits, chat edit |
| `phases/v3-home-mode.md` | Style quiz, budget, renter mode, cost range, sharing, free tier |
| `phases/v4-pro-mode.md` | Clients, brief links, rate cards, estimates, proposals, approval |
| `phases/v5-billing.md` | Plans, checkout, webhooks, credit grants, gating |
| `phases/v6-production.md` | Security, reliability, observability, legal, SEO, deploy, launch |

## Phase overview (rough, solo, part-time)

| Phase | Outcome | Time |
|---|---|---|
| V1 | Sign up, choose mode, land on the right dashboard; CI green | ~1 week |
| V2 | Upload a room photo, get AI renders, edit by chat, credits work | ~2 weeks |
| V3 | Complete Home-mode experience with free tier and sharing | ~1 week |
| V4 | Complete Pro-mode workflow, proposal PDF, client approval page | ~2–3 weeks |
| V5 | Paid plans, webhooks, credit grants | ~1 week |
| V6 | Hardened, observable, legal-ready, deployed, launch checklist | ~1–2 weeks |

## Decision gates (the agent must stop and ask)

| Gate | Decision | When |
|---|---|---|
| G1 | Product name and domain | Before V3 marketing copy |
| G2 | Image provider and model (after fidelity test on real room photos) | During V2 |
| G3 | Hosting target (Vercel + worker on your server, or all Docker) | Before V6 |
| G4 | Billing provider (Stripe or a merchant of record like Paddle) | Start of V5 |
| G5 | Final plan prices and credit grants (from measured cost per render) | During V5 |

## Conventions used in these docs

- `- [ ]` is a task. The agent changes it to `- [x]` when done.
- "MUST" and "NEVER" are hard rules. "SHOULD" is a default the agent may change if it records why in `DECISIONS.md`.
- Code snippets are guides. Always check the current official docs of a library before using it.
