# Codexa API contract (internal)

All JSON endpoints live under `/api/v1/*` (auth under `/api/auth/*`, inbound webhooks under `/api/webhooks/*`).
Every handler uses `handler()` from `src/lib/api.ts`, validates bodies with zod via `parseBody()`, authenticates with
`requireApiUser()`, and authorizes with `assertProjectAccess()` / `assertWorkspaceRole()` from `src/lib/services/access.ts`.
Errors: `{ error: { code, message, details? } }` with proper status codes (400/401/403/404/409/402 quota/429/500).

## Auth (`/api/auth`) — implemented
POST /signup, /login, /logout, /forgot-password, /reset-password, /verify-email, /resend-verification · GET /me
GET /github/start, GET /github/callback (owner: integrations agent)

## Workspaces & projects (`/api/v1`) — owner: workspace agent
GET  /workspaces                      → { workspaces: [{ workspace, role }] }
POST /workspaces                      { name } → { workspace }
GET  /workspaces/:id/members          → { members, invites }
POST /workspaces/:id/invites          { email, role } → { invite }           (owner: billing/teams agent)
DELETE /workspaces/:id/members/:userId                                     (owner: billing/teams agent)
GET  /projects?workspaceId=           → { projects }
POST /projects                        { workspaceId, name, description?, templateId } → { project }   (enforces plan project limit via assertQuota-style check on count)
GET  /projects/:id                    → { project, role, workspace }
PATCH /projects/:id                   { name?, description?, visibility?, settings? }
DELETE /projects/:id                  (soft delete; owner/admin only)
GET  /projects/:id/files              → { files: [{ path, size, updatedAt }] }
GET  /projects/:id/files/content?path= → { path, content }
PUT  /projects/:id/files/content      { path, content } → { file }
POST /projects/:id/files/rename       { from, to, isFolder? }
DELETE /projects/:id/files?path=      (file) or &folder=1
GET  /projects/:id/search?q=          → { results: [{ path, line, text }] }
GET  /projects/:id/snapshots          → { snapshots }
POST /projects/:id/snapshots          { name, message? } → { snapshot }
GET  /projects/:id/snapshots/:sid     → { snapshot, diff: FileDiff[] }  (diff vs current files)
POST /projects/:id/snapshots/:sid/restore
GET  /projects/:id/activity           → { activity }
GET/PUT/DELETE /projects/:id/env      env vars (values encrypted; GET returns masked values unless ?reveal=1 for editors)
POST /projects/:id/share              { access: 'view'|'edit', expiresInDays? } → { url }  · DELETE /projects/:id/share/:linkId
GET  /templates?q=&category=&framework=&sort=  → { templates (without files) }   (public, no auth)

## AI (`/api/v1/projects/:id/ai`) — owner: AI agent
GET  /conversations                   → { conversations }
POST /conversations                   → { conversation }
GET  /conversations/:cid/messages     → { messages }
POST /generate                        { conversationId?, prompt, mode?: 'build'|'ask'|'fix' } → SSE stream of events
      events: stage, text (delta), tool_call, tool_result, file_change, plan, usage, done, error
POST /runs/:runId/cancel
GET  /runs/:runId                     → { run, diff: FileDiff[] }  (diff vs snapshotBefore)
POST /runs/:runId/revert              restores snapshotBefore
GET  /status                          → { configured: boolean, provider, model }  (never pretend AI works when unconfigured)

## Runtime & deployments — owner: runner agent
POST /projects/:id/runtime/start      → { session: { id, status, previewUrl } }
POST /projects/:id/runtime/stop
GET  /projects/:id/runtime            → { session | null, runnerAvailable: boolean }
GET  /projects/:id/runtime/logs       → SSE stream of { ts, stream: 'stdout'|'stderr'|'system', line }
POST /projects/:id/runtime/sync       { paths? } pushes changed files into the running sandbox
POST /projects/:id/runtime/exec       { command: 'install'|'build'|'test'|'typecheck' } → { exitCode, output } (allowlisted commands only)
POST /projects/:id/deployments        { provider: 'codexa'|'vercel' } → { deployment }
GET  /projects/:id/deployments        → { deployments }
GET  /projects/:id/deployments/:did   → { deployment }   (with buildLog)
POST /projects/:id/deployments/:did/rollback

## Integrations — owner: integrations agent
GET  /integrations                    → { providers: [{ id, name, category, configured, docsUrl }], connections }
POST /workspaces/:id/integrations     { provider, name, config, secret? } → { connection }  · POST .../:cid/test · DELETE .../:cid
POST /projects/:id/github/import      { repo, branch? }   · POST /projects/:id/github/push { message, branch? } · GET /projects/:id/github/status
POST /projects/:id/database/query     { connectionId, sql, confirmDestructive?: boolean } → { rows, fields, rowCount }   (destructive statements require confirmDestructive)
GET  /projects/:id/database/schema?connectionId=

## Billing & usage — owner: billing agent
GET  /workspaces/:id/usage            → { plan, limits, used, remaining, periodStart }
GET  /workspaces/:id/billing          → { subscription, invoices, providers: { stripe, razorpay } }
POST /workspaces/:id/billing/checkout { plan, interval, currency } → { url } (Stripe) or { order } (Razorpay)
POST /workspaces/:id/billing/cancel  · POST /workspaces/:id/billing/portal
POST /api/webhooks/stripe · POST /api/webhooks/razorpay   (idempotent via webhook_events)

## Support / forms — owner: public website agent
POST /forms/contact | /forms/support | /forms/bug | /forms/feature | /forms/feedback | /forms/sales | /forms/demo | /forms/newsletter | /forms/disclosure
GET  /search?q=&type=                → { results } (docs, guides, blog, templates, integrations, changelog, help)

## Admin (`/api/v1/admin/*`) — owner: billing/admin agent (requireApiAdmin on every handler)

## Shared client contracts (components other agents import)
- `src/components/ai/chat-panel.tsx`      export `ChatPanel({ projectId, conversationId? })`
- `src/components/workspace/preview-panel.tsx` export `PreviewPanel({ projectId })`
- `src/components/workspace/logs-panel.tsx`    export `LogsPanel({ projectId })`
- `src/components/workspace/github-panel.tsx`  export `GithubPanel({ projectId })`
- `src/components/workspace/database-panel.tsx` export `DatabasePanel({ projectId })`
- `src/components/workspace/deploy-panel.tsx`  export `DeployPanel({ projectId })`
Client-side cross-panel events: `window.dispatchEvent(new CustomEvent('codexa:files-changed', { detail: { paths: string[] } }))`
and `codexa:open-file` `{ path }`, `codexa:runtime-status` `{ status, previewUrl }`. Use `src/lib/client/events.ts`.
