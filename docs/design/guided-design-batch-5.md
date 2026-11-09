# Guided design — batch 5

User-approved scope: core-flow bug fixes, reliability and final UX testing, plus
documentation reconciliation. This is guided-design batch 5, not V5 billing.

- [x] Stabilize generation/edit submission, status polling and room/history state; align environment/test wiring and project documentation; verify and commit.

No billing, new preview imagery, model selection, new library, migration or
deployment is included. G2 real-provider fidelity and manual usability review stay
open. See [current project status](../project-status.md) for the consolidated state.

## Built

- Home and Pro share cancellable status reads with a 15-second request timeout,
  five-consecutive-failure limit and ten-minute polling window. Responses must
  validate and match the requested job ID. Switching jobs/unmounting aborts reads
  and ignores late replies. A visible **Check status again** action restarts reads
  only, without generating or charging for another image.
- Generation/edit submissions catch dropped or invalid responses, keep editable
  state and never automatically retry a mutation whose server outcome is unknown.
- Pro design-history switching now closes the old composer. Both history controls
  are disabled during edit submission. Room-specific result components are keyed
  by room ID so jobs, drafts and selections cannot carry over to another room.
- Advice provider/model/allowance variables and the existing dev-auth setting are
  included in Turbo's strict environment list. Production examples include advice
  settings. Local app/auth example URLs match the actual dev port, 3001.
- The root test command serializes Turbo package tasks, fixing the observed shared
  Vitest cache startup race. CI uses that command and explicitly sets both image
  generation and analysis to fake providers.
- README, current Home/Pro summaries, architecture/auth/pipeline notes, security
  inventory, runbook and completed batch reports are reconciled. New status/index
  pages distinguish current implementation from historical snapshots and open
  phase review gates. Dated decisions remain chronological history.
- Deployment docs and rollback service names now match the existing host-Nginx
  Compose topology (web/worker). Bootstrap guidance states that host TLS/Nginx
  setup is separate. No script, migration or deployment was executed on a server.

## Verification

- `pnpm typecheck && pnpm lint && pnpm test` passes across all 11 packages,
  including 73 web tests. New coverage verifies confirmed/unconfirmed submissions,
  no automatic mutation retries, terminal completion, invalid/mismatched status
  payloads, request timeout, failure/time limits, read-only restart and late replies.
- `pnpm test:e2e`: all six browser journeys pass. The Home flow deliberately fails
  five status reads, observes the paused state, resumes with Check status again,
  and completes selection/drafts/masked edit/source/history checks. Auth/onboarding,
  Pro uploaded brief → estimate/PDF → approval, wizard styles and share/vote pass.
- `pnpm build` passes for web and worker using fake providers. The worker's existing
  no-emit build produces Turbo's non-blocking no-output warning.
- Current 375px screenshots were reviewed, including the photographic style flow;
  browser overflow assertions pass. All five recorded browser accounts/workspaces
  were cleaned up.
- Changed Markdown links resolve, every local env-template variable appears in
  Turbo's environment list, both deployment shell files pass `bash -n`, and
  `git diff --check` passes. No deployment scripts were executed beyond syntax checks.
- No real provider call, default model change, migration or deployment occurred.
  G2 fidelity/detection/boundary quality, V4 manual usability timing and CI/live
  production evidence remain open. Phase acceptance boxes were not falsely ticked.

## Sources checked

- Installed Next.js server/client-component and server-action documentation.
- [Turborepo environment handling](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables)
- [Turborepo run options](https://turborepo.dev/docs/reference/run)
