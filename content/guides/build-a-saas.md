---
title: Build a SaaS
description: Structure a multi-tenant SaaS on Codexa - a React frontend, a Node + Express API, email/password auth, workspaces and Stripe or Razorpay billing.
category: Projects
order: 2
tags: [saas, authentication, billing, express]
author: Codexa Team
date: 2026-10-24
difficulty: intermediate
duration: 2 hours
related: [build-your-first-app, connect-a-database, ai-app-development]
---

Codexa's templates are single-purpose: a browser app, a static site or an API. A SaaS needs the first and the third. This guide builds them as two projects in the same workspace and wires them together.

## Architecture

```text
┌──────────────────┐   fetch /api/*   ┌──────────────────────┐   SQL   ┌────────────┐
│ frontend project │ ───────────────▶ │ api project (Express) │ ──────▶ │ PostgreSQL │
│ Vite + React     │                  │ sessions, tenants     │         │ (yours)    │
└──────────────────┘                  └──────────────────────┘         └────────────┘
```

The frontend deploys to Codexa hosting (static). The API runs in a preview during development and is hosted on a Node host of your choice for production; Codexa hosting is static only. See [Deployment](/docs/deployment).

## Step 1: The API project

1. Create a project from the **Node + Express** template; name it `saas-api`.
2. [Connect a database](/guides/connect-a-database) and add `DATABASE_URL` as an environment variable.
3. Ask the agent, in Build mode:

```text
Set up the data model for a multi-tenant SaaS with pg:
- tables: users, workspaces, memberships(role: owner|member), sessions
- a migrations/ folder with SQL files and an `npm run migrate` script
- bcrypt password hashing; httpOnly session cookie; requireUser middleware
- routes: POST /auth/signup, /auth/login, /auth/logout, GET /me,
  POST /workspaces, GET /workspaces
- every workspace route checks membership server-side
Done when `npm run typecheck` and `npm run build` pass.
```

4. Run the preview and use the Logs panel to confirm the server starts. Run the migration with **Run command → test** if you wired it there, or from your machine against the same database.

## Step 2: The frontend project

1. Create a project from a **Vite + React** template; name it `saas-web`.
2. Add `VITE_API_URL` as an environment variable pointing at the API preview URL.
3. Ask the agent:

```text
Add sign-up, sign-in and a workspace switcher that talk to the API at
import.meta.env.VITE_API_URL with credentials: "include".
Protected routes redirect to /login when GET /me returns 401.
```

> Note: Cookies across two origins need the API to send `Access-Control-Allow-Credentials` and `SameSite=None; Secure` in production. Ask the agent to add the CORS configuration with the frontend origin from an environment variable.

## Step 3: Billing

Add a Stripe (international) or Razorpay (India) connection under workspace Integrations so the credential is tested, then add the secret as `STRIPE_SECRET_KEY` or `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` in the API project.

```text
Add subscription billing with Stripe Checkout:
- POST /billing/checkout creates a Checkout session for the current workspace
- POST /webhooks/stripe verifies the signature, stores event ids in a
  webhook_events table and ignores duplicates, and updates
  workspaces.plan on checkout.session.completed and
  customer.subscription.deleted
- never trust plan changes from the client
```

That is the same pattern Codexa uses for its own billing: verify, deduplicate, then act. See [Webhooks](/api/webhooks).

## Step 4: Enforce limits server-side

Whatever your plans promise, check them in the API before the action happens, and return a consistent error. Codexa returns `402 quota_exceeded`; copying that shape keeps the frontend simple.

## Step 5: Deploy

- `saas-web` → Codexa hosting, with `VITE_API_URL` set to the production API URL at build time.
- `saas-api` → push to GitHub from the GitHub panel and deploy to your Node host; point `DATABASE_URL` and the session secret at production values there.

## Checklist before launch

- Passwords hashed, sessions httpOnly, CORS restricted to your origin.
- Every workspace route checks membership.
- Webhook signature verified and events deduplicated.
- Environment variables set in both projects; none committed to GitHub.
