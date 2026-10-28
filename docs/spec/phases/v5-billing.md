# V5 — Billing and Plans

**Goal:** users can subscribe, receive monthly credits, buy top-ups, manage or cancel their plan, and the server gates features by plan. All billing events are idempotent.

**Read first:** `AGENT.md`, `04-ai-pipeline.md` (credits), `02-database.md` (`Subscription`, `WebhookEvent`, `CreditLedger`).

## Decision gates (stop and ask before building)

- **G4 Billing provider**: Stripe, or a merchant of record such as Paddle (handles global sales tax and VAT for you). Availability and fees depend on the founder's country and business setup — the human must confirm which provider can pay out to them. Do not pick on your own.
- **G5 Plans, prices and credit grants**: derived from measured data. Run a report script first: average `costMicros` per render job and per output image, by quality tier, from real usage. Propose plans so that **gross margin ≥ 60%** after provider cost and payment fees, assuming 100% credit usage. The human approves final numbers.

## 1. Plan configuration

- [ ] `packages/shared/src/plans.ts`: typed config, no hard-coded prices in code paths.

```ts
export const PLANS = {
  FREE:      { monthlyCredits: 0 /* signup grant only */, watermark: true,  proTools: false },
  HOME_PLUS: { monthlyCredits: TBD, watermark: false, proTools: false },
  PRO:       { monthlyCredits: TBD, watermark: false, proTools: true  },
} as const;
```

- [ ] Top-up packs config (credits and price per pack), also from G5.
- [ ] `getPlanState(ctx)` returns `{ plan, status, periodEnd }` from `Subscription` (FREE if none or canceled past period end).
- [ ] `requirePlan(ctx, feature)` used on the server for: removing the watermark, Pro tools (clients, rate cards beyond 1, proposals, brief links), higher variation counts, high quality renders. Mode is NOT a gate.

## 2. Billing package

- [ ] `packages/billing`: `BillingProvider` interface:

```ts
interface BillingProvider {
  createCheckout(input: { workspaceId: string; plan: PlanKey | TopUpKey; successUrl: string; cancelUrl: string; customerEmail: string }): Promise<{ url: string }>;
  createPortalSession(input: { customerId: string; returnUrl: string }): Promise<{ url: string }>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<BillingEvent>; // throws on invalid signature
}
```

- [ ] Implement the chosen provider. Read its current docs first (checkout, subscriptions, webhooks, signature verification, customer portal, test mode).
- [ ] Normalize provider events into `BillingEvent` (`subscription.created|updated|canceled`, `payment.succeeded`, `payment.failed`, `topup.paid`).

## 3. Checkout and portal

- [ ] `/pricing` page: plans, what each includes, FAQ (credits, renter mode, refunds). Currency display appropriate to the visitor where the provider supports it.
- [ ] "Upgrade" actions create a checkout session (server action) with `workspaceId` in provider metadata. Success page polls until the webhook has updated the plan (no trust in the redirect alone).
- [ ] "Manage billing" opens the provider portal.
- [ ] Cancel and downgrade: access continues until period end; credits already granted stay until used.

## 4. Webhooks (`POST /api/webhooks/billing`)

- [ ] Read the **raw body**; verify the signature; reject invalid with 400.
- [ ] Idempotency: insert into `WebhookEvent` (id = provider event id) inside the same transaction as the effects; if it already exists, return 200 and do nothing.
- [ ] `subscription.created|updated`: upsert `Subscription` (plan, status, period end).
- [ ] **Monthly credit grant** on successful payment: ledger row `PLAN_GRANT` with `refId = ${providerSubscriptionId}:${periodStart}` (unique, so it can never double-grant).
- [ ] `topup.paid`: ledger row `PURCHASE` with `refId = provider payment id`.
- [ ] `payment.failed`: set `PAST_DUE`; show a banner; keep access for a grace period (config, e.g. 5 days), then fall back to FREE.
- [ ] Out-of-order and duplicate events are handled (compare event timestamps or fetch the latest subscription state from the provider before writing).
- [ ] Return 2xx quickly; do heavy work in the transaction only.

## 5. In-app

- [ ] Billing settings page: current plan, renewal date, credit balance, recent ledger entries (grants, spends, refunds), top-up buttons, manage billing link.
- [ ] Low-credit banner and an upgrade modal where credits run out (replace V2/V3 stubs).
- [ ] Remove the watermark and unlock Pro tools only through `getPlanState` and `requirePlan`.
- [ ] Emails: receipt is the provider's; send our own "plan activated", "payment failed", "credits low" emails through `EmailSender`.

## 6. Margin and cost reporting

- [ ] `pnpm report:costs` script: per workspace and overall — credits granted, credits spent, provider cost (`costMicros`), revenue estimate from plan config, gross margin estimate. Used for G5 and monthly review.

## 7. Tests

- [ ] Webhook: invalid signature rejected; duplicate event no-ops; out-of-order handled.
- [ ] Plan grant idempotency (same period twice → one grant).
- [ ] `requirePlan` gating for every gated feature (FREE blocked, paid allowed).
- [ ] Downgrade/cancel keeps access until period end.
- [ ] Provider test mode end to end (manual checklist): subscribe, grant, renders spend credits, cancel, portal.

## Definition of Done for V5

- [ ] All boxes ticked; CI green.
- [ ] G4 and G5 decisions recorded in `DECISIONS.md`.
- [ ] A real test-mode purchase and a real webhook delivery succeeded in a staging environment.
- [ ] Cost report shows ≥ 60% projected gross margin per plan.
- [ ] Summary for the human.

**Out of scope for V5:** annual plans, coupons, team billing, invoicing.
