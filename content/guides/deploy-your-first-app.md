---
title: Deploy your first app
description: From a working preview to a live URL on Codexa hosting, then rollback, Vercel and a custom domain.
category: Ship
order: 5
tags: [deployment, hosting, rollback, vercel, domains]
author: Codexa Team
date: 2026-10-24
difficulty: beginner
duration: 15 min
related: [build-your-first-app, build-a-saas]
---

This guide assumes a Vite + React or static project that runs in the preview. Node + Express projects cannot be deployed to Codexa hosting (it is static); see [Deployment](/docs/deployment#supported-frameworks).

## Step 1: Make sure the build passes

In the Logs panel run **typecheck** and **build**. A deployment runs the same build in a fresh sandbox; if it fails here it will fail there.

## Step 2: Deploy to Codexa hosting

1. Open **Deploy** → **Codexa hosting** → **Deploy**.
2. The build log streams. On success the deployment is marked **live** and the URL is shown.
3. Open the URL. The output directory (`dist/` for Vite, the project root for static sites) is served with long-lived caching for hashed assets.

## Step 3: Redeploy and roll back

Change the page title, save, deploy again. The Deploy panel lists both deployments with status, time and the build log. Press **Rollback** on the first one: it becomes live again immediately, with no rebuild.

## Step 4: Environment variables at build time

Vite inlines `VITE_*` variables during the build. Set them in **Settings → Environment variables** before deploying; the static output cannot read variables afterwards.

## Step 5 (optional): Vercel

Add a Vercel token under workspace Integrations, then choose **Vercel** in the Deploy panel. Codexa uploads the files and environment variables through the Vercel API and polls the status. The adapter exists but has not yet been verified end-to-end against real accounts, and the panel says so. If you rely on Vercel today, pushing the project to GitHub and connecting the repository in Vercel is the proven path.

## Step 6 (optional): Custom domain

On Pro or Team, add your domain under **Settings → Domains** and create a CNAME record at your DNS provider pointing at the project's hosting subdomain. Automatic verification is not implemented yet; the steps are in [Custom domains](/docs/custom-domains).

## Quotas

Deployments count against the monthly plan limit (5 on Free). A `quota_exceeded` error names the limit.
