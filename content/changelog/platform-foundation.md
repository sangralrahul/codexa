---
title: Platform foundation
description: Accounts with email verification and password reset, hashed sessions, personal workspaces and the API conventions every endpoint follows.
category: Release
order: 1
version: 0.1.0
tags: [release, accounts, api]
author: Codexa Team
date: 2026-10-24
related: [workspace-and-editor, billing-and-teams]
---

The first public release of Codexa, **0.1.0**, ships the account and API foundation that every other area builds on.

## Accounts

- Email/password sign-up with verification emails and single-use, expiring tokens.
- Password reset with the same token mechanism.
- Sessions as httpOnly cookies; session tokens stored hashed with expiry and revocation.
- GitHub sign-in when the operator configures an OAuth app; the sign-in page shows the button only in that case.
- A personal workspace for every account.

## API conventions

- All JSON endpoints under `/api/v1/*`, authentication under `/api/auth/*`, inbound webhooks under `/api/webhooks/*`.
- One error shape everywhere: `{ error: { code, message, details? } }` with 400/401/402/403/404/409/429/500.
- Every handler authenticates, checks workspace role or project access on the server, and validates bodies with zod.
- Rate limiting on auth, AI and public form endpoints with `Retry-After`.

## Operator configuration

Capabilities that depend on external services (email, GitHub, AI providers, Stripe, Razorpay, Vercel, E2B) are detected from server environment variables and rendered as explicit "not configured" states in the product when missing.

See the [API overview](/api) and [API reference](/api/reference).
