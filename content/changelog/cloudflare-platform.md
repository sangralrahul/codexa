---
title: Codexa runs on Cloudflare
description: The app moves to Cloudflare Workers, its data to D1, snapshots and hosted sites to R2, project runtimes to one Cloudflare Container per project, presence to Durable Objects and background jobs to Cron Triggers.
category: Release
order: 1
version: 0.2.0
tags: [release, platform, cloudflare, runtime]
author: Codexa Team
date: 2026-10-25
related: [workspace-and-editor, runtime-and-previews, deployments]
---

Release **0.2.0** moves the whole hosted service onto Cloudflare. Email is the one exception: account emails go through Customer.io. Features work as they did in 0.1.0; this entry lists where each part now runs and what changed as a result.

## Database on D1

- Accounts, workspaces, projects, project files, billing records and jobs live in Cloudflare D1 (SQLite) instead of PostgreSQL.
- A file can be up to 1 MB and a project can hold up to 2,000 files. Storage is metered per workspace, as before.

## Snapshots and hosted sites on R2

- Snapshot contents are stored in Cloudflare R2. The database keeps each snapshot's name, file count and size.
- Codexa hosting builds the site in the project's container, uploads the output to R2 and serves the live deployment from the Worker. Rollback switches which deployment is live, without rebuilding.

## Runtime on Cloudflare Containers

- Each project gets its own Cloudflare Container, owned by a Durable Object. It starts on demand for a preview, Run, a command or a build, and stops after 30 minutes without requests.
- Inside the container the runner works as before: allow-listed commands only, run as an unprivileged user, with output streamed to the Logs panel. The container is the isolation boundary between projects.
- Previews are served at a per-project preview address that the Worker forwards to that project's container.

## Presence and background jobs

- "Who's online" in the editor runs on a Durable Object per project, with the same protocol as before.
- Background jobs (email retries, session and token cleanup, usage roll-ups, runtime sweeps) run from a Cron Trigger every 5 minutes.

## For operators

- `npm run setup` logs in to Cloudflare, stores the secrets, deploys and creates the database tables. `docs/CLOUDFLARE.md` in the repository is the step-by-step guide.
- Without a custom domain Codexa runs on a `workers.dev` address. Everything works except live preview, Run and Codexa hosting, and the app says plainly that those need a domain.

Documentation: [Projects](/docs/projects), [Security](/docs/security), [Deployment](/docs/deployment).
