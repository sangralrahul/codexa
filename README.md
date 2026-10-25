# Codexa

**Turn ideas into working software.** Codexa is an AI-native software development platform:
describe an application in natural language, generate a full-stack project, edit the code in a real
editor, run it in an isolated sandbox with a live preview, review and revert AI changes, connect
services, collaborate, and deploy.

![Workspace](docs/screenshots/workspace.png)

## What is in this repository

| Area | Where | Status |
| --- | --- | --- |
| Public website (product, solutions, pricing, company, trust, support, forms, SEO) | `src/app/(marketing)` | ✅ 130 routes, tested |
| Documentation, guides, blog, help, changelog, roadmap, API reference, global search | `content/`, `src/lib/content`, `src/app/(marketing)/docs` … | ✅ |
| Templates gallery, integrations directory, community showcase | `src/templates`, `src/app/(marketing)/templates` … | ✅ 18 runnable starters |
| Accounts, sessions, email verification, password reset, GitHub sign-in (when configured) | `src/lib/auth`, `src/app/(auth)` | ✅ |
| Workspace: dashboard, projects, files, Monaco editor, snapshots/diff/restore, env vars, share links | `src/app/(app)`, `src/components/workspace` | ✅ |
| AI engine: Anthropic/OpenAI providers, tool-using agent, SSE streaming, review & revert, bounded repair | `src/lib/ai`, `src/components/ai` | ✅ (needs an API key; dev mock available) |
| Runtime: one Cloudflare Container per project (preview, run, logs, allow-listed exec); local runner for development | `services/runner`, `containers/runner`, `worker/sandbox.ts`, `src/lib/runtime` | ✅ verified in Cloudflare's local runtime with real containers; Docker/E2B drivers unverified |
| Deployment: Codexa static hosting (built in the container, served from R2) with history and rollback; Vercel adapter | `src/lib/deploy`, `worker/sites.ts` | ✅ Codexa hosting verified; Vercel unverified |
| Integrations: GitHub import/commit/push, PostgreSQL/Supabase schema + SQL runner, provider connections | `src/lib/github`, `src/lib/integrations` | ✅ (GitHub OAuth needs an app) |
| Billing: Free/Pro/Team/Enterprise, INR + USD, Stripe + Razorpay, idempotent webhooks, server-side quotas | `src/config/plans.ts`, `src/lib/billing` | ✅ logic tested; live provider calls unverified |
| Teams: roles, invitations, settings; staff admin area; background jobs (Cron Trigger); realtime presence (Durable Object) | `src/app/(app)/settings`, `src/app/admin`, `src/lib/jobs`, `worker/presence.ts` | ✅ |

See `docs/IMPLEMENTATION_PLAN.md`, `docs/AI_ENGINE.md`, `docs/RUNTIME.md`, `docs/INTEGRATIONS.md`,
`docs/BILLING.md` and `docs/API_CONTRACT.md` for details.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · Drizzle ORM + Cloudflare D1 ·
Monaco (self-hosted) · Vitest · Playwright. Production runs entirely on Cloudflare (Workers, D1, R2,
Containers, Durable Objects, Cron Triggers); email goes through Customer.io (or Resend). For local
development the sandbox **runner** and the WebSocket **realtime** server also run as plain Node processes.

## Run locally

Requirements: Node 22+. For live previews with `npm run dev`: Linux (the local sandbox driver uses user
namespaces + cgroups; run the runner as root or with the needed capabilities). On Windows or macOS use
`npm run cf:preview` instead, which runs previews in Docker containers (needs Docker Desktop).

```bash
cp .env.example .env.local            # fill SESSION_SECRET and ENCRYPTION_KEY (openssl rand -base64 32)
cp .env.local .env                    # side services read .env
npm install                           # also copies Monaco into public/monaco
npm run db:migrate                    # creates the local D1 database under .wrangler/
npm run db:seed                       # optional: admin@codexa.local / admin12345, demo@codexa.local / demo12345
npm run runner:prepare                # once: prebuilt dependency sets for templates (needs npm registry)
npm run dev:all                       # web :3000, runner :4000/:4100, realtime :4200
```

Open http://localhost:3000. Without an email provider (`CUSTOMERIO_APP_API_KEY` or `RESEND_API_KEY`), verification and invite emails are stored in the
database and can be opened at http://localhost:3000/dev/mailbox (development only).

To run the production build in Cloudflare's runtime on your machine (real containers through Docker,
D1/R2 emulated locally): copy `.dev.vars.example` to `.dev.vars`, then `npm run cf:preview` and open
http://localhost:8787.

To exercise the AI pipeline without a provider key during development set `AI_MOCK=1`
(development/test only; the UI shows a "Mock AI" badge). Real generation needs `ANTHROPIC_API_KEY` or
`OPENAI_API_KEY`.

## Checks

```bash
npm run lint
npm run typecheck        # app and worker
npm run test             # unit + integration tests on a local D1 copy (.wrangler/test-state)
npm run build
npm run test:e2e         # Playwright; core journey needs AI_MOCK=1 and the runner running
# Against `npm run cf:preview` or a deployed instance:
E2E_NO_SERVER=1 E2E_BASE_URL=http://localhost:8787 E2E_D1=local npx playwright test tests/e2e/serverless-smoke.spec.ts --project=desktop
```

One integration test (connecting an external PostgreSQL database) needs a Postgres server at
`TEST_DATABASE_URL`; it is skipped when none is reachable.

## Environment variables

All variables are documented in `.env.example` (local development) and `.dev.vars.example` / `wrangler.jsonc`
(Cloudflare). Required: `SESSION_SECRET`, `ENCRYPTION_KEY`, `APP_URL`. Optional integrations (each enables
a capability and otherwise renders an explicit "not configured" state): `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
`CUSTOMERIO_APP_API_KEY` or `RESEND_API_KEY`, `GITHUB_CLIENT_ID/SECRET`, `STRIPE_*`, `RAZORPAY_*`, `VERCEL_TOKEN`, `E2B_API_KEY`.

## Deployment

**Cloudflare**: follow `docs/CLOUDFLARE.md` (step by step, plain language). In short: Workers Paid plan,
secrets via `wrangler secret put`, then `npm run cf:deploy` and `npm run db:migrate:remote`. It runs on
`workers.dev` without a domain; live previews and Codexa hosting additionally need a domain on Cloudflare
(one `*` DNS record, free certificate) and Docker when deploying. CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and both builds.

## Security model (summary)

Server-side authorization on every route (`assertProjectAccess` / `assertWorkspaceRole`), httpOnly
session cookies with hashed tokens, scrypt passwords, AES-256-GCM for stored secrets, zod validation,
database-backed rate limiting, audit logs, sandboxed execution outside the web process, destructive SQL
confirmation, idempotent payment webhooks. No third-party certifications are claimed.

## License

Proprietary. All rights reserved.
