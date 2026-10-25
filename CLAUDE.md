# Codexa — engineering conventions (read before writing code)

Codexa is an AI-native software development platform (prompt → full-stack app → edit → run → deploy).
This file is the contract every contributor and subagent follows. Keep changes consistent with it.

## Stack (do not change)
- Next.js 16.4 App Router, React 19, TypeScript strict, Tailwind CSS v4 (CSS-first config in `src/app/globals.css`).
- Drizzle ORM + PostgreSQL (`src/db/schema.ts`, migrations in `drizzle/`). Run `npm run db:generate && npm run db:migrate` after schema changes.
- Custom session auth (`src/lib/auth`). No Clerk/Supabase Auth. Sessions are httpOnly cookies; tokens are hashed at rest.
- UI primitives in `src/components/ui` (Button, Input/Textarea/Select/Field, Card, Badge, Alert, Dialog, DropdownMenu, Tabs, Tooltip, EmptyState, Skeleton). Icons: `lucide-react`. Radix via the `radix-ui` umbrella package.
- Monaco is served from `/monaco/vs` (copied by postinstall). Never load it from a CDN.
- Tests: Vitest (`tests/unit`, `tests/integration`), Playwright 1.63 (`tests/e2e`). Playwright is preinstalled; never run `playwright install`.
- Services: `services/runner` (sandboxed execution + preview proxy), `services/realtime` (WebSocket presence), `services/worker` (job queue). They run with `tsx`, outside Next.js.

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
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build`
