---
title: Integrations
description: Workspace-level connections for GitHub, databases, AI providers, payments, email and hosting, how they are stored and tested.
category: Build
order: 15
tags: [integrations, connections, github, stripe, razorpay, resend, vercel]
author: Codexa Team
date: 2026-10-24
related: [github, databases, environment-variables, deployment]
---

Integrations are **connections** stored at the workspace level and used by projects in that workspace. Admins and owners manage them from the workspace's Integrations page; the [integrations directory](/integrations) lists every provider and what Codexa does with it.

## Providers

| Provider            | What the connection enables                                                     |
| ------------------- | ------------------------------------------------------------------------------- |
| GitHub              | Import a repository into a project; commit and push project files back. OAuth. |
| PostgreSQL          | Schema browser and SQL runner in projects; connection string for your code.     |
| Supabase            | Same as PostgreSQL, using the Supabase connection string.                       |
| OpenAI / Anthropic  | Credentials tested with a small request. The platform-level key configured by the operator is what the agent uses today. |
| Stripe              | Secret key stored for projects that need it; tested by reading the account.     |
| Razorpay            | Key id + secret; tested by reading the account.                                 |
| Resend              | API key for transactional email from your apps; tested by listing domains.      |
| Vercel              | Deployment token used by the Vercel deployment adapter.                         |

## Adding a connection

1. Workspace → **Integrations** → choose a provider.
2. Give it a name and paste the credential. Secrets are encrypted with the platform's encryption key before they are written to the database and are never returned by the API (`GET` responses show masked values only).
3. **Test connection** runs a provider-specific, read-only request and shows the real outcome, including the provider's error message when it fails.

A failed test does not delete the connection; fix the credential and test again.

## Using a connection in a project

Connections are not injected automatically. To use a credential in your running code, add it as a project [environment variable](/docs/environment-variables). Database connections are selectable in the Database panel; GitHub connections are used by the GitHub panel; Vercel tokens are used by the Deploy panel.

## When a provider is not configured

Some integrations also depend on operator-level configuration (for example GitHub OAuth needs a client id and secret on the server). When that is missing, the corresponding panel renders a **not configured** state with the environment variables the operator has to set, instead of a broken button.

## Removing a connection

Deleting a connection revokes it for every project in the workspace immediately. Secrets are removed with the row.
