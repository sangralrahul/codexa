---
title: Deployments
description: Codexa static hosting with build logs, history and rollback; a Vercel adapter that needs a token; CNAME instructions for custom domains.
category: Release
order: 5
version: 0.1.0
tags: [release, deployment, hosting]
author: Codexa Team
date: 2026-10-24
related: [runtime-and-previews, integrations]
---

## Codexa hosting

- Builds in a fresh sandbox and serves the static output at a subdomain. Since [0.2.0](/changelog/cloudflare-platform) the build runs in the project's Cloudflare Container and the output is served from R2.
- Build log per deployment, deployment history, one-click rollback without rebuilding.
- Supports Vite + React and static projects. Node + Express projects are not deployable to static hosting; Next.js is not available yet.

## Vercel

- Adapter that uploads files and environment variables through the Vercel API using a workspace token.
- Implemented but not yet verified end-to-end against real accounts; the Deploy panel states this.

## Custom domains

- Domains recorded per project with CNAME instructions. Automatic verification and certificate issuance are on the [roadmap](/roadmap).

Documentation: [Deployment](/docs/deployment), [Custom domains](/docs/custom-domains).
