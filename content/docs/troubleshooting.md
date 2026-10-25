---
title: Troubleshooting
description: The error codes Codexa returns (quota_exceeded, ai_not_configured, runner unavailable, confirmation_required, email_taken, invalid_token, rate_limited) and what to do about each.
category: Account
order: 32
tags: [errors, troubleshooting, support]
author: Codexa Team
date: 2026-10-24
related: [ai-agent, billing, deployment]
---

Every API error has the same shape, and the product surfaces the `code` in its error messages:

```json
{ "error": { "code": "quota_exceeded", "message": "…", "details": { } } }
```

## `quota_exceeded` (402)

A plan limit was reached: AI requests or tokens, runtime minutes, deployments, storage, projects or members. `details.kind` says which. Wait for the monthly reset, free up resources (delete projects, reduce storage) or upgrade under Workspace → Billing. See [Billing](/docs/billing).

## `ai_not_configured` (503)

No AI provider key is configured on this Codexa deployment, so the agent cannot run. The agent panel shows the same state. The operator needs to set an Anthropic or OpenAI key on the server; nothing you can do in the UI changes this.

## Runner unavailable

Previews, builds and the agent's validation step need the runner service. When it is down or unreachable, `GET /runtime` reports `runnerAvailable: false`, the Preview panel shows **Runner unavailable** and runtime starts fail with a 503. The web app, editor and snapshots keep working. Check [status](/status) and try again; if it persists, contact support with the project id.

## `confirmation_required` (409)

The SQL runner refused a destructive statement (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `ALTER`) on the first attempt. Re-run with the confirmation flag (the panel asks you) if you really mean it. See [Databases](/docs/databases).

## `email_taken` (409)

An account with that email already exists. Sign in instead, or use **Forgot password** if you do not remember the password.

## `invalid_token` (400)

A verification or password-reset link is invalid, already used or expired. Request a new one from [/forgot-password](/forgot-password) or **Resend verification** on the sign-in page. Links are single-use.

## `invalid_credentials` (401)

Wrong email or password. After repeated failures the sign-in endpoint rate-limits the address.

## `rate_limited` (429)

Too many requests from your IP or account in a short window. The response includes `Retry-After` in seconds and `resetAt`. Public forms allow 5 submissions per 15 minutes; search allows 120 requests per minute; auth and AI endpoints have their own windows.

## `unauthorized` (401) / `forbidden` (403)

Your session has expired (sign in again) or your role in the workspace does not allow the action (ask an admin to change it). Viewers cannot edit, run or deploy.

## `not_found` (404)

The project, snapshot, run or workspace does not exist or you do not have access to it. Codexa deliberately does not distinguish the two cases.

## `bad_request` (400)

The request body failed validation. `details` lists each field and message. In the UI this appears as inline form errors.

## Preview does not start

1. Open the Logs panel; the sandbox's `stdout`/`stderr` is streamed there with the real error.
2. Common causes: a missing dependency (run **install**), a port other than the template's default, or a failing dev command. Fix in the editor or paste the log into a **Fix** mode prompt.
3. Runtime minutes may be exhausted (`quota_exceeded` with `kind: runtime_minutes`).

## Build fails on deploy

The build log in the Deploy panel is the complete output of the build command. Type errors stop the build; run **typecheck** before deploying, or ask the agent to fix the errors.

## Still stuck

Open a ticket at [/support](/support) with the project id, the error code and the time. Security issues go to [security@codexa.app](mailto:security@codexa.app).
