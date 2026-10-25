# Codexa — implementation plan (prioritized)

Status legend: ✅ done · 🔧 in progress · ⏳ planned · 🚫 blocked (needs credentials/infra)

## Repository audit (2026-10-24)
The working directory was empty and no Codexa repository existed on GitHub for this account, so this is a
greenfield build. The environment offers Node 22, PostgreSQL 16, Redis, Playwright/Chromium, Linux user
namespaces + cgroup v1 (usable for sandboxing), and outbound access to npm, api.github.com, api.anthropic.com
and Google Fonts. Blocked outbound hosts: OpenAI, Vercel, E2B, Resend, Stripe, Razorpay, CDNs. No AI API key
is present. Docker has no daemon.

## Stack decisions
- Next.js 16 App Router (Turbopack), React 19, TypeScript strict, Tailwind v4 CSS-first tokens.
- Drizzle ORM + Cloudflare D1 (SQLite); SQL migrations in `drizzle/`. Snapshots and hosted sites in R2.
  (Originally PostgreSQL; moved to D1 so everything except email runs on Cloudflare. See docs/CLOUDFLARE.md.)
- Custom cookie-session auth (scrypt passwords, hashed session/auth tokens) — no external auth provider is
  reachable from this environment and the flows must be verifiable.
- Monaco served from our origin (`/monaco/vs`) because CDNs are blocked and self-hosting is more reliable.
- `services/runner` for sandboxed execution + preview proxy (never in the Next.js process). On Cloudflare it
  runs inside one Container per project, owned by the `ProjectSandbox` Durable Object.
- Realtime presence: `services/realtime` locally, the `PresenceRoom` Durable Object on Cloudflare.
- Background jobs: D1 `jobs` table drained by the Worker's Cron Trigger (`src/lib/jobs/run.ts`).

## Phase 1 — Foundation ✅
Env validation, schema (33 tables), migrations, crypto, auth flows + API + pages, email transport (Resend or
outbox), rate limiting, API helpers, access control, workspace/project/file/snapshot services, usage/quota
service, plan config, route manifest, design tokens + UI primitives, marketing header/footer, app shell.

## Phase 2 — Public website 🔧
Homepage, product/solutions/pricing/company/trust/support pages, forms persisted to `support_tickets`,
docs + learning center + help + changelog + roadmap, API docs generated from a registry that checks the
route files exist, global search (MiniSearch), templates gallery, integrations directory, showcase,
sitemap/robots/OG image/JSON-LD.

## Phase 3 — Core workspace 🔧
Dashboard, projects CRUD, file APIs, Monaco editor (tabs, search, diff, autosave), snapshots/restore,
env vars, share links, AI provider abstraction (Anthropic, OpenAI, dev-only mock), agent loop with tools,
SSE streaming, snapshots before runs with review/revert, usage accounting.

## Phase 4 — Execution 🔧
Runner service: namespace + cgroup sandbox (local driver), Docker/E2B driver boundaries, preview proxy with
WebSocket support, log streaming, allowlisted exec (install/build/typecheck/test), idle cleanup, bounded
repair loop driven by the AI agent.

## Phase 5 — Full-stack features 🔧
PostgreSQL/Supabase connections (schema inspection, SQL runner with destructive confirmation), GitHub OAuth,
import via Git Trees API, commit & push via Git Data API, version history, Codexa static hosting deployment
with rollback, Vercel adapter (🚫 unverifiable here).

## Phase 6 — Commercial 🔧
Plans, server-side limits, Stripe + Razorpay checkout/subscriptions/webhooks with idempotency (🚫 live calls
unverifiable here), teams/roles/invites, account settings, admin area, job worker.

## Phase 7 — Expansion 🔧
Realtime presence, integrations adapters, showcase, learning content, INR/USD + timezone formatting.

## Phase 8 — Release readiness ⏳
Lint/typecheck/tests/build green, authorization audit, secrets review, e2e journey, docs, final report.

## Known external dependencies
| Capability | Needs | Status here |
| --- | --- | --- |
| AI generation | `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | 🚫 no key (mock provider for dev/test only) |
| Email delivery | `RESEND_API_KEY` | 🚫 outbox fallback |
| GitHub sign-in/import/push | GitHub OAuth app | 🚫 unit-tested with mocked API |
| Payments | Stripe / Razorpay keys + webhooks | 🚫 signature/idempotency unit-tested |
| Vercel deploys | `VERCEL_TOKEN` | 🚫 host blocked |
| Codexa hosting deploys | runner service | ✅ local |
