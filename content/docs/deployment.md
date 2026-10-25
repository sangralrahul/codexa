---
title: Deployment
description: Deploying with Codexa hosting and Vercel, which frameworks are supported, build logs, history and rollback.
category: Ship
order: 20
tags: [deployment, hosting, vercel, rollback]
author: Codexa Team
date: 2026-10-24
related: [custom-domains, environment-variables, troubleshooting]
---

A deployment builds the project in a sandbox and publishes the output. Codexa ships one provider that works out of the box and one adapter that needs a token.

## Providers

| Provider        | Status                        | What it does                                                                 |
| --------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| Codexa hosting  | Available                     | Builds in the sandbox and serves the static output at a subdomain with history and rollback. |
| Vercel          | Adapter exists; needs a token | Uploads the build to Vercel through its API using a workspace Vercel connection. Not yet verified end-to-end against real accounts; the panel says so. |

## Supported frameworks

| Template family        | Codexa hosting | Vercel adapter | Notes                                           |
| ---------------------- | -------------- | -------------- | ----------------------------------------------- |
| React + Vite + TS      | Yes            | Yes            | `npm run build` → `dist/`                       |
| Static HTML/CSS/JS     | Yes            | Yes            | No build step; the project root is served       |
| Node + Express API     | No             | No             | Needs a long-running process; run it in a preview or host it elsewhere for now |
| Next.js                | Not yet        | Not yet        | A Next.js template is on the roadmap            |

Codexa hosting is **static** hosting: it serves files, not server processes. Deploy the API part of a project to a Node host and point the frontend at it with an environment variable.

## Deploying with Codexa hosting

1. Open the **Deploy** panel and choose Codexa hosting.
2. The build runs in a fresh sandbox: dependencies are installed, the template's build command runs, and the output directory is captured. The build log streams into the panel.
3. On success the deployment becomes **live** at the project's subdomain. The hostname pattern is set by the operator (for example `<project>.apps.example.com`).
4. Each deployment keeps its build log and output. **Rollback** on any earlier successful deployment makes it live again without rebuilding.

Failed builds never replace the live deployment.

## Deploying with Vercel

1. Add a Vercel connection with a token under workspace Integrations.
2. Choose Vercel in the Deploy panel. Codexa uploads the project files and your environment variables and creates the deployment through the Vercel API.
3. Status and the Vercel URL are polled and shown in the panel.

Without a token the panel renders a **not configured** state with instructions instead of a disabled button.

## Limits

Deployments per month are metered by plan (5 on Free, 100 on Pro, 500 on Team). Exceeding the limit returns `quota_exceeded`.

## Custom domains

Pointing your own domain at a Codexa hosting deployment is done with a CNAME record; see [Custom domains](/docs/custom-domains).
