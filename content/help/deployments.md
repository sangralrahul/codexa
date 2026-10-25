---
title: Deployments
description: Deploying to Codexa hosting, build failures, rollback, Vercel and custom domains.
category: Shipping
order: 5
tags: [deployment, hosting, rollback, domains]
author: Codexa Team
date: 2026-10-24
related: [previews, projects]
---

## Which projects can be deployed?

Vite + React and static projects deploy to Codexa hosting, which serves static files. Node + Express APIs need a long-running process and must be hosted elsewhere for now; push them to GitHub from the GitHub panel.

## The build failed

The Deploy panel shows the full build log. Run **typecheck** and **build** from the Logs panel to reproduce, fix the error (or paste it into Fix mode), and deploy again. The last successful deployment stays live.

## Rolling back

Deploy panel → earlier deployment → **Rollback**. It becomes live immediately without rebuilding.

## Vercel

The Vercel option needs a token under workspace Integrations. The adapter is implemented but not yet verified against real accounts; the panel says so. Pushing to GitHub and connecting the repository in Vercel is the proven route today.

## Custom domains

Pro and Team plans. Add the domain in project settings and create a CNAME at your DNS provider. Verification is manual today; see [custom domains](/docs/custom-domains).

## Deployment limits

5 per month on Free, 100 on Pro, 500 on Team. Rollbacks do not count.
