# AGENTS.md — Rules for the AI coding agent

You are building **RoomDesigner** (working title), an AI room design product with a Home mode and a Pro mode. The full spec is in `docs/spec/`. Start with `docs/spec/README.md`.

## Execution protocol

1. Work on **one phase at a time**, in order: V1 → V6. Never start a phase before the human approves the previous one.
2. Before coding a phase, read its phase file and every doc it references. Write a short plan (10–20 lines) to `DECISIONS.md` at the repo root.
3. Do tasks in order. When a task is done, change its `- [ ]` to `- [x]` in the phase file.
4. After every task run: `pnpm typecheck && pnpm lint && pnpm test`. Fix failures before moving on.
5. Commit after every task with a conventional commit message (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
6. At the end of a phase: run the phase's Definition of Done, write a summary of what was built, what was skipped, and any open questions. Then **stop and wait for human review**.
7. If blocked or unsure about a product decision, stop and ask. Do not guess on decision gates (G1–G5 in the README).

## Verify third-party APIs

Better Auth, Prisma, pg-boss, Next.js, the OpenAI SDK, the AWS SDK, react-pdf and billing providers change often. Before using any of them, read the current official docs (use a docs tool or web search). NEVER guess method names or option names from memory. If the docs differ from a snippet in this spec, follow the docs and note the difference in `DECISIONS.md`.

## Hard rules

- TypeScript `strict`. No `any`. No `@ts-ignore` without a comment explaining why.
- Validate all external input with **zod** at every boundary: route handlers, server actions, webhooks, queue payloads, public forms.
- **Money** is stored as integer minor units (cents, paise). **Lengths** are stored as integer millimetres. NEVER use floating point for money.
- All area and price math lives in `packages/estimate`. UI code never calculates prices.
- **Every query on tenant data MUST be scoped by `workspaceId`.** Use the helpers in `03-auth-and-workspaces.md`. Never trust a client-sent `workspaceId`.
- Secrets never go in the repo. Every new env var is added to `.env.example` and to the zod env schema. The app fails to boot if required env vars are invalid.
- Dev and tests use `IMAGE_PROVIDER=fake`. The real provider is only used behind the `MAX_DAILY_SPEND_USD` guard. Tests never call a paid API.
- Do not hand-edit generated code: the Prisma client, and Better Auth CLI output (the only allowed manual change there is adding back-relation fields; re-apply them after regenerating).
- Do not add a dependency that is not listed in `01-architecture.md` without recording the reason in `DECISIONS.md`.
- Do not build anything listed under Non-goals in `00-product.md`.
- Every user-facing screen has loading, empty and error states, works on mobile, and is keyboard accessible with labelled form fields.
- Copy: renders are "concept visuals". NEVER claim exact dimensions, exact prices or binding quotes from AI output.

## Code conventions

- Package manager: pnpm. Build orchestration: Turborepo.
- Mutations from the UI use Next.js server actions. Polling, uploads, webhooks and public pages use route handlers.
- Business logic lives in service modules (`apps/web/src/server/services/*`), not inside components or route files. Services take `(db, ctx, input)` and return plain objects.
- Errors: throw typed `AppError(code, message, status)`. Route handlers and actions map them to responses. Never leak stack traces or provider errors to users.
- Logging: structured JSON (pino). Never log secrets, tokens, full emails, or image bytes.
- File names: `kebab-case.ts`. React components: `PascalCase.tsx`. One exported component per file.
- Tests: Vitest for unit and integration, Playwright for end-to-end. New logic in `packages/estimate`, credits, and authorization MUST have tests.

## Definition of done (every task)

- [ ] Code compiles with no type errors, lint passes, tests pass.
- [ ] New or changed behavior has tests (see the test notes in the phase file).
- [ ] New env vars documented in `.env.example`.
- [ ] No tenant query without `workspaceId` scoping.
- [ ] UI has loading, empty and error states and works at 375px width.
- [ ] Task checkbox ticked in the phase file; commit made.

## Files you maintain

- `DECISIONS.md` — short log: date, decision, reason. Include every deviation from the spec.
- Phase files — tick checkboxes. Do not rewrite their content.
