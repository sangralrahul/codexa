---
title: Billing
description: Plans, currencies, usage limits, how limits are enforced, invoices, payment providers and cancellation.
category: Account
order: 30
tags: [billing, plans, usage, stripe, razorpay]
author: Codexa Team
date: 2026-10-24
related: [troubleshooting, getting-started]
---

Billing is per workspace. The plan sets limits that the server enforces; the pricing page shows the current prices in INR and USD with monthly and annual intervals.

## Plans

| Plan       | Projects | Members | AI requests / month | Runtime / month | Deployments / month | Storage |
| ---------- | -------- | ------- | ------------------- | --------------- | ------------------- | ------- |
| Free       | 3        | 1       | 50                  | 5 hours         | 5                   | 250 MB  |
| Pro        | 25       | 1       | 1,000               | 100 hours       | 100                 | 5 GB    |
| Team       | 100      | 10      | 5,000               | 500 hours       | 500                 | 25 GB   |
| Enterprise | custom   | custom  | custom              | custom          | custom              | custom  |

AI tokens are also metered (500k on Free, 10M on Pro, 50M on Team). The full matrix is on [compare plans](/pricing/compare-plans); the values on this page are copied from the plan configuration and may be updated there.

## How limits are enforced

Every metered action (an AI run, a runtime minute, a deployment, a file write that grows storage, a new project or member) is checked **on the server before it happens**. When a limit is reached the API returns HTTP 402 with:

```json
{ "error": { "code": "quota_exceeded", "message": "Usage limit reached for ai requests (50/50). Upgrade your plan to continue.", "details": { "kind": "ai_request", "used": 50, "limit": 50 } } }
```

Counters reset at the start of each calendar month (UTC). Usage is visible under Workspace → Usage and through `GET /api/v1/workspaces/:id/usage`.

## Payment providers

- **Stripe** handles international cards and invoices in USD.
- **Razorpay** handles payments in INR for customers in India.

The checkout endpoint returns a Stripe Checkout URL or a Razorpay order depending on the currency you pick. Subscription state is updated from provider webhooks, which are verified and idempotent (see [Webhooks](/api/webhooks)). If the operator has not configured a provider, the billing page shows it as unavailable rather than failing at checkout.

## Invoices

Invoices come from the provider (Stripe or Razorpay) and are listed on the workspace billing page with links to the provider-hosted PDF.

## Changing or cancelling

- Upgrades take effect immediately; the provider prorates according to its rules.
- Cancelling keeps the paid plan until the end of the current period, then returns the workspace to Free. Projects above the Free limit are kept but new ones cannot be created until you are under the limit.
- Stripe customers can also manage payment methods through the billing portal link.

## Enterprise

Enterprise plans have custom limits and invoice billing. Use [contact sales](/contact-sales).

> Review: Refund terms are described on the [refund policy](/refund-policy) page, which requires legal review before publication.
