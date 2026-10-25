---
title: Integrations
description: GitHub OAuth with import and push, PostgreSQL and Supabase connections with a schema browser and SQL runner, and tested workspace connections for AI, payments, email and hosting.
category: Release
order: 6
version: 0.1.0
tags: [release, integrations, github, database]
author: Codexa Team
date: 2026-10-24
related: [deployments, billing-and-teams]
---

## GitHub

- OAuth connection (when the operator configures the app), repository import into a new project, commit and push of project files, status endpoint.

## Databases

- PostgreSQL and Supabase connections, encrypted at rest and tested on creation.
- Schema browser from `information_schema`.
- SQL runner with a confirmation step for destructive statements (`confirmation_required`).

## Workspace connections

- OpenAI, Anthropic, Stripe, Razorpay, Resend and Vercel connections with provider-specific connection tests and masked reads.

Documentation: [Integrations](/docs/integrations), [Databases](/docs/databases), [GitHub](/docs/github).
