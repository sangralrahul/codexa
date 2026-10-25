# Codexa — engineering conventions (read before writing code)

Codexa is an AI-native software development platform (prompt → full-stack app → edit → run → deploy).
This file is the contract every contributor and subagent follows. Keep changes consistent with it.

## Stack (do not change)
- Next.js 16.4 App Router, React 19, TypeScript strict, Tailwind CSS v4 (CSS-first config in `src/app/globals.css`).
- Hosting: Cloudflare for everything except email (Customer.io). Workers via `@opennextjs/cloudflare` (entry `worker/index.ts`), D1, R2, Containers, Durable Objects, Cron Triggers. Config in `wrangler.jsonc`; operator guide in `docs/CLOUDFLARE.md`.
- Drizzle ORM + Cloudflare D1/SQLite (`src/db/schema.ts`, migrations in `drizzle/`). Run `npm run db:generate && npm run db:migrate` after schema changes.
- D1 rules: no interactive transactions (use `runBatch()` from `src/db` with IDs generated up front); at most 100 bound parameters per statement (use `chunked()`); rows are capped at 2 MB (large blobs go to R2 via `src/lib/storage.ts`). No Postgres-only SQL (`::casts`, `ilike`, `FOR UPDATE`).
- Bindings: read Cloudflare bindings through `src/lib/cloudflare/bindings.ts` (`bindings()`, `requireBinding()`), never from globals.
- Custom session auth (`src/lib/auth`). No Clerk/Supabase Auth. Sessions are httpOnly cookies; tokens are hashed at rest.
- UI primitives in `src/components/ui` (Button, Input/Textarea/Select/Field, Card, Badge, Alert, Dialog, DropdownMenu, Tabs, Tooltip, EmptyState, Skeleton). Icons: `lucide-react`. Radix via the `radix-ui` umbrella package.
- Monaco is served from `/monaco/vs` (copied by postinstall). Never load it from a CDN.
- Tests: Vitest (`tests/unit`, `tests/integration`), Playwright 1.63 (`tests/e2e`). Playwright is preinstalled; never run `playwright install`.
- Runtime: `services/runner` (sandboxed execution + preview proxy). On Cloudflare it runs inside one Container per project, owned by the `ProjectSandbox` Durable Object (`worker/sandbox.ts`, image in `containers/runner/`); locally it runs with `tsx`. Always talk to it through `runnerFor(projectId)` in `src/lib/runtime/client.ts`.
- Realtime presence: `PresenceRoom` Durable Object (`worker/presence.ts`) on Cloudflare, `services/realtime` locally. Same protocol in both.
- Background jobs: `src/lib/jobs` (handlers in `handlers.ts`), drained by the Worker's Cron Trigger through `/api/internal/cron`.

## Next.js 16 rules (breaking vs older versions)
- `cacheComponents` is OFF. Use the classic model: pages that read cookies/DB are dynamic automatically. Do not use `"use cache"`.
- `cookies()`, `headers()`, `params`, `searchParams` are **async**: `const { slug } = await params;`. Type page props as `{ params: Promise<{ slug: string }> }`.
- Middleware is `src/proxy.ts` (export `proxy`), not `middleware.ts`. Keep it light (redirects only); authorization lives in server code.
- Turbopack is the bundler. No `webpack` config. No `runtime = 'edge'` exports.
- Route handlers: `export const GET = handler(async (req, ctx) => ...)` using `src/lib/api.ts`. Route context params are a Promise: `const { id } = await ctx.params`.
- Metadata: export `metadata` or `generateMetadata` on every page; use `src/lib/seo.ts` helpers.

## Security rules (non-negotiable)
- Every API route and server action checks auth with `requireApiUser()` / `requireUser()` and checks resource ownership via `src/lib/services/access.ts` (`assertProjectAccess`, `assertWorkspaceRole`). Never trust client-supplied workspace/project ids without an access check.
- Secrets are encrypted with `encryptSecret()` before storage and never returned to the browser.
- Generated/user code never runs inside the Next.js process; only via the runner service.
- Validate every request body with zod via `parseBody()`. Rate-limit auth and AI endpoints with `enforceRateLimit()`.
- Never fabricate: no fake stats, customers, certifications, AI output, or deployment success. When a capability is not configured, render an explicit "not configured" state (see `capabilities` in `src/lib/env.ts`).

## Code style
- Server components by default; add `"use client"` only for interactivity. Keep client components small.
- Data access goes through `src/lib/services/*` (not raw db calls inside components/routes).
- Use `cn()` from `src/lib/utils.ts` for class merging. Use design tokens (`bg-background`, `text-muted-foreground`, `border-border`, `bg-primary`, etc.), never hard-coded hex in components.
- Responsive and accessible by default: semantic HTML, labels on inputs, visible focus, keyboard-operable menus, `aria-*` where needed, no inert buttons or dead links.
- Public routes come from `src/config/routes.ts` (titles/descriptions). Add new public routes there too.
- Marketing pages use the templates in `src/components/marketing/*`. Keep copy factual; mark anything that needs legal/security review with a `ReviewNote` component.
- Logging via `src/lib/logger.ts` (never log secrets).

## Commands
- `npm run dev` (web), `npm run runner:dev`, `npm run realtime:dev`, `npm run dev:all`
- `npm run cf:preview` (production build in local workerd with real containers; needs Docker), `npm run cf:deploy`, `npm run db:migrate:remote`
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build`
