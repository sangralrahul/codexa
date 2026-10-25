# Billing, teams, account settings, admin and the job worker

This document covers the business platform: plans and subscriptions (Stripe for
international/USD, Razorpay for India/INR), usage display and enforcement, workspace
teams, account settings, the staff admin area and the background worker.

## Where things live

| Area | Code |
| --- | --- |
| Plan catalog helpers (price per currency/interval, annual math) | `src/lib/billing/plans.ts` over `src/config/plans.ts` |
| Stripe client, Checkout Session, portal, signature verification | `src/lib/billing/stripe.ts` |
| Razorpay API (plans, subscriptions, cancel) and HMAC verification | `src/lib/billing/razorpay.ts` |
| Pure subscription state machine (provider payload → row patch) | `src/lib/billing/state.ts` |
| Webhook pipeline (record → apply → mark, idempotent) | `src/lib/billing/webhooks.ts` |
| Workspace-facing billing operations, manual overrides, workspace settings | `src/lib/billing/service.ts` |
| Team rules (pure) and team operations (invites, roles, removal) | `src/lib/billing/teams.ts`, `src/lib/billing/team-service.ts` |
| Account operations (profile, password, sessions, export, delete) | `src/lib/billing/account-service.ts` |
| Admin queries and mutations | `src/lib/billing/admin-service.ts` |
| Feature flags helper for any module | `src/lib/billing/flags.ts` → `isFlagEnabled(key)` |
| Job queue (SKIP LOCKED, retries with backoff) | `src/lib/jobs/index.ts` |
| Worker process | `services/worker/index.ts`, `services/worker/handlers.ts` (`npm run worker:start`) |
| Settings UI | `src/app/(app)/settings/**`, `src/components/settings/**` |
| Admin UI | `src/app/admin/**`, `src/components/admin/**` |
| Invite acceptance page | `src/app/(auth)/invite/[token]/page.tsx` |
| Tests | `tests/unit/billing/**`, `tests/integration/billing/**` |

## Environment variables

```
# Stripe (international, USD)
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_...          # optional, not needed for hosted Checkout

# Razorpay (India, INR)
RAZORPAY_KEY_ID=rzp_live_or_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

`capabilities.stripe` / `capabilities.razorpay` in `src/lib/env.ts` gate every code path.
When neither provider is configured:

- `POST /api/v1/workspaces/:id/billing/checkout` returns `503 billing_not_configured`;
- `/settings/billing` shows an alert naming the variables above and hides the plan picker;
- staff can still assign plans manually from `/admin/workspaces` (“Override plan”), which
  creates a `subscriptions` row with `provider = manual` that `getEffectivePlan` honours.

Prices are configured in `src/config/plans.ts` in minor units **per month**; annual plans are
shown per month and billed `12 × month` once a year (`getPlanPrice`).

## Stripe setup

1. Create a Stripe account; no products or prices need to be pre-created. Checkout sessions
   are built with `price_data` from `PLANS` (`createStripeCheckout`), with
   `metadata { workspaceId, plan, interval }` on both the session and the subscription.
2. Add a webhook endpoint pointing at `https://<APP_URL>/api/webhooks/stripe` with the events
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`,
   `invoice.payment_failed`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Enable the Customer Portal in the Stripe dashboard; “Manage payment method” on the billing
   page opens it (`POST /billing/portal`).
4. Locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

Flow: the user picks a plan in the dialog → the server creates a Checkout Session → the browser
is redirected to Stripe → Stripe redirects back to `/settings/billing?checkout=success` → the
`checkout.session.completed` webhook activates the subscription and sets `workspaces.plan`.
Cancellation sets `cancel_at_period_end` (resumable until the period ends).

## Razorpay setup

1. Enable **Subscriptions** on the Razorpay account.
2. Plan objects are created on the fly with `POST /v1/plans` and keyed by
   `notes.codexaKey = "<plan>:<interval>:INR"`; ids are cached in `workspaces.settings.razorpayPlans`
   and looked up by notes before creating (`ensureRazorpayPlan`).
3. Add a webhook at `https://<APP_URL>/api/webhooks/razorpay` with the events
   `subscription.authenticated`, `subscription.activated`, `subscription.charged`,
   `subscription.halted`, `subscription.cancelled`, `subscription.completed`,
   `subscription.pending`, `payment.failed`. Put the webhook secret in `RAZORPAY_WEBHOOK_SECRET`.

Flow: the server creates a subscription (`POST /v1/subscriptions`) and returns
`{ subscriptionId, keyId }`; the client loads `https://checkout.razorpay.com/v1/checkout.js`
on demand and opens Checkout; on success the client posts
`razorpay_payment_id`, `razorpay_subscription_id`, `razorpay_signature` to
`POST /api/v1/workspaces/:id/billing/razorpay`, where the server verifies
`hmac_sha256(payment_id + "|" + subscription_id, RAZORPAY_KEY_SECRET)` and records the
subscription as active (the webhook later confirms periods and payments).
Razorpay cancellations use `cancel_at_cycle_end = 1` and cannot be resumed.

## Webhook guarantees

Both endpoints:

1. verify the signature on the **raw body** (Stripe: `stripe.webhooks.constructEvent`;
   Razorpay: HMAC-SHA256 compared in constant time with `X-Razorpay-Signature`);
2. insert into `webhook_events` (`unique(provider, event_id)`); a duplicate returns
   `200 { duplicate: true }` without re-processing (Razorpay uses `X-Razorpay-Event-Id`,
   falling back to a hash of the body);
3. apply the transition from `src/lib/billing/state.ts`: upsert the subscription by
   `(provider, provider_subscription_id)`, record invoices by `(provider, provider_invoice_id)`,
   then set `workspaces.plan` to the effective plan;
4. mark `processed_at` (or `error`). Processing errors return 500 so the provider retries.

State rules: failed payments set `past_due`; entitlements continue until
`current_period_end`, after which `getEffectivePlan` falls back to `free`. Cancelled, completed,
expired and incomplete subscriptions grant nothing. Card details are never stored.

## Usage

`GET /api/v1/workspaces/:id/usage` returns `getWorkspaceEntitlements` (plan, limits, used,
remaining, period start) plus project and member counts. `/settings/usage` and
`/settings/billing` render progress bars per metric (unlimited shown as such) with an upgrade
CTA. Limits are enforced server-side by `assertQuota` (AI requests/tokens, runtime minutes,
deployments, storage), by the project API (projects) and by `team-service` (members; pending
invitations reserve seats; `402 quota_exceeded`).

## Teams

- Roles: owner > admin > editor > viewer (`src/lib/services/access.ts`).
- Owners and admins invite (`POST /workspaces/:id/invites`, 20/hour/workspace), list, revoke and
  resend; only owners may invite or promote owners. The invitation email uses
  `emails.workspaceInvite`; without `RESEND_API_KEY` it lands in `email_outbox`
  (visible at `/dev/mailbox` in development) and the UI says so.
- `PATCH /workspaces/:id/members/:userId { role }` — the last owner cannot be demoted;
  granting `owner` is an explicit transfer that also updates `workspaces.owner_id`.
- `DELETE /workspaces/:id/members/:userId` — admins remove editors/viewers, owners remove
  anyone, members can leave; the last owner cannot be removed.
- `GET /api/v1/invites/:token` (public preview) and `POST` (accept; the signed-in email must
  match). `/invite/<token>` renders the preview and links to `/signup` or `/login` with
  `next=/invite/<token>` when signed out.
- Every change writes an `audit_logs` row (`team.*`, `billing.*`, `account.*`, `admin.*`).

## Account settings

- `/settings/profile`: name, time zone (`Intl.supportedValuesOf("timeZone")`), language
  (`en`, `hi` placeholder), https avatar URL.
- `/settings/security`: change password (current password required; revokes other sessions),
  active sessions with the current one marked and per-session/all-other revocation,
  JSON export (`GET /api/v1/account/export`, 5/hour) and account deletion
  (`POST /api/v1/account/delete { password }`): anonymises the email to
  `deleted+<id>@invalid`, clears credentials, purges sessions/tokens/OAuth accounts,
  soft-deletes workspaces where the user is the only member and transfers owned shared
  workspaces to the most senior remaining member.

## Admin area

`/admin` (layout calls `requireAdmin()`; every `/api/v1/admin/*` handler calls
`requireApiAdmin()`; `user` role → 403). Pages: overview counts, users (search, role change
for admins only, suspend/restore), workspaces (plan/members/projects, manual plan override),
subscriptions, AI health (capabilities + last 20 generation runs), jobs (queue stats, retry),
runtimes, deployments (failures with build log tail), support tickets and abuse reports (status
workflow), audit logs (filters), feature flags (CRUD) and showcase approvals.
Lists are offset-paginated (25/page) on indexed columns.

## Worker

```
npm run worker:start      # polls every 5s (WORKER_POLL_MS), graceful SIGTERM/SIGINT
```

Job kinds: `email.retry` (resends failed outbox mail when Resend is configured),
`cleanup.sessions`, `cleanup.expired_tokens` (tokens, stale invites, rate-limit windows),
`usage.rollup` (placeholder: reports 24h totals), `runtime.sweep` (pings the runner; no-op
when absent). Recurring jobs re-enqueue their next run on completion. Other modules enqueue with
`enqueue(kind, payload, { runAt, maxAttempts })` from `src/lib/jobs`. Claiming uses
`SELECT … FOR UPDATE SKIP LOCKED`; failures retry with exponential backoff
(30s, 60s, 120s … max 1h) until `max_attempts`, then `failed`; stale `running` locks older than
10 minutes are reclaimed.

## Testing

```
npx vitest run tests/unit/billing tests/integration/billing
```

- Unit: plan price math, Stripe (`generateTestHeaderString`) and Razorpay (real HMAC)
  signature verification incl. invalid/stale cases, the state machine, team role rules.
- Integration (test database): webhook routes end to end with signed synthetic payloads,
  idempotent redelivery, `past_due` → entitlements kept → cancel → free; job queue with three
  concurrent claimers; invites create → accept with the right email (wrong email rejected),
  seat limits (402), resend/revoke; role changes and last-owner protection; account deletion
  anonymisation; admin authorization and mutations.

## What is not verified in this environment

Outbound connections to `api.stripe.com`, `api.razorpay.com` and `checkout.razorpay.com` are
blocked here and no provider keys exist, so the following are implemented but **unverified
against the real providers**: creating Checkout Sessions and portal sessions, creating Razorpay
plans/subscriptions, cancel/resume calls to the providers, and the Checkout.js browser flow.
Signature verification, idempotency and all state transitions are verified with synthetic
payloads. Email delivery through Resend is likewise unverified; the outbox fallback is verified.
