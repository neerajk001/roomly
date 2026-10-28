# 03 — Auth and Workspaces

Library: **Better Auth** with the Prisma adapter (PostgreSQL). Package: `packages/auth`.

> Read the current Better Auth docs before implementing: installation, Prisma adapter, CLI schema generation, Next.js integration, email/password, social providers, additional user fields, and database hooks. Snippets below are guides only.

## Capabilities for V1

- Email + password with **email verification**
- Google sign-in
- Password reset
- Session cookie auth
- `user.mode` additional field: `"HOME"` or `"PRO"` (default `"HOME"`)

## Server config outline (`packages/auth/src/server.ts`)

```ts
// Guide only — verify option names against current Better Auth docs.
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@roomdesigner/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION,
    // sendResetPassword: uses EmailSender
  },
  emailVerification: { /* sendVerificationEmail: uses EmailSender */ },
  socialProviders: { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } },
  user: { additionalFields: { mode: { type: "string", defaultValue: "HOME" } } },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => { await bootstrapWorkspace(user); },
      },
    },
  },
});
```

## Workspace bootstrap (runs once per new user)

In a single transaction:
1. Create `Workspace` (`type: PERSONAL`, name = "<first name>'s space", owner = user).
2. Create `WorkspaceMember` (role `OWNER`).
3. Insert `CreditLedger` row: `delta = SIGNUP_FREE_CREDITS`, `reason = SIGNUP_GRANT`, `refId = workspace.id` (unique, so it can never double-grant).

Make the bootstrap idempotent: if the workspace already exists for the owner, do nothing.

## Onboarding (`/onboarding`)

1. Ask: "I'm designing my home" → `mode = HOME`, or "I'm a design professional" → `mode = PRO`.
2. If PRO also ask: studio name, currency, unit system. Then convert the workspace to `type = STUDIO` and set the name, currency, unit system, and create a default rate card (V4).
3. If HOME ask currency/units only if the country guess is uncertain. Default from browser locale.
4. Redirect: HOME → `/app`, PRO → `/studio`.

Mode can be changed later in `/settings`. Changing mode never deletes data.

## Session and tenant helpers (`apps/web/src/server/auth/*`)

```ts
requireSession(): Promise<{ user }>                 // 401/redirect if no session
requireWorkspace(): Promise<{ user, workspace, role }>
  // Resolves the user's workspace from membership. V1: exactly one workspace per user.
  // NEVER accepts a workspaceId from the client.
requireVerifiedEmail(ctx): void                     // needed before spending credits
```

### Authorization rules (MUST)

1. Every service function receives `ctx = { userId, workspaceId }` from `requireWorkspace()`.
2. Every Prisma query on tenant data includes `workspaceId` (directly, or via `project: { workspaceId }` for child tables). Use `findFirst({ where: { id, workspaceId } })`, not `findUnique({ where: { id } })`, for tenant records.
3. Return **404** (not 403) when a record exists in another workspace, so ids cannot be probed.
4. Middleware only does an optimistic cookie check for redirects. **Real authorization happens in server code** on every action and route handler.
5. Feature access is checked against the **plan** on the server (`requirePlan`, V5). Mode is only a UI preference.

## Route groups

| Group | Paths | Access |
|---|---|---|
| `(marketing)` | `/`, `/pricing`, `/styles/...` | Public |
| `(auth)` | `/sign-in`, `/sign-up`, `/verify-email`, `/forgot-password`, `/reset-password` | Public (redirect if signed in) |
| `(app)` | `/app/**` | Session, Home UI |
| `(studio)` | `/studio/**` | Session, Pro UI |
| Public token pages | `/p/[token]`, `/brief/[token]`, `/share/[token]` | Token only, no session |

If a PRO-mode user opens `/app`, or the reverse, show the page. Do not block by mode.

## Public token links

- Generate with `crypto.randomBytes(24).toString("base64url")` (192 bits).
- Look up by token only. Check `expiresAt` and status.
- Tokens grant only the narrow actions of that page:
  - `/p/[token]`: view the proposal, comment, approve / request changes.
  - `/brief/[token]`: submit the brief form and upload photos to that workspace (rate-limited, size-limited).
  - `/share/[token]`: view project renders (read-only) and vote.
- Never expose workspace internals, other projects, or ids that allow listing.
- Add `X-Robots-Tag: noindex` and `Referrer-Policy: no-referrer` on these pages.
- Rate-limit by IP and token.

## Abuse controls tied to auth

- No credit spending until email is verified.
- Rate-limit sign-up, sign-in and password reset (use Better Auth's built-in rate limiter if available; otherwise add a Postgres-backed limiter).
- Block obvious disposable email domains (small static list, easy to update).

## Tests

- Unit: `bootstrapWorkspace` is idempotent and grants credits once.
- Integration: sign up → workspace exists → ledger has the signup grant.
- Isolation tests per `02-database.md`.
- E2E: sign up → onboarding (both modes) → correct dashboard.
