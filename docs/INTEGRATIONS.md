# Integrations (GitHub, databases, provider connections, realtime presence)

Owner: integrations area. Code lives in `src/lib/github/**`, `src/lib/integrations/**`,
`src/app/api/auth/github/**`, `src/app/api/v1/integrations/**`, `src/app/api/v1/workspaces/[id]/integrations/**`,
`src/app/api/v1/projects/[id]/{github,database,realtime-token}/**`, `src/components/integrations/**`,
`src/components/workspace/{github-panel,database-panel,presence}.tsx`, `src/lib/client/presence.ts`,
`services/realtime/**`, `src/config/integrations.ts`.

## 1. Provider directory (`src/config/integrations.ts`)

Shared, stable data consumed by the public `/integrations` pages, the search index, `GET /api/v1/integrations`
and the connection forms. Shape (do not change without telling the website owner):

```ts
{ id, name, category: 'databases'|'authentication'|'ai'|'payments'|'email'|'analytics'|'storage'|'hosting'|'git'|'productivity',
  description, status: 'available'|'planned',
  configFields: [{ key, label, type: 'text'|'password'|'url', required, placeholder }],
  docsPath, capabilities: string[] }
```

Fields with `type: 'password'` are secrets: they are encrypted with `encryptSecret()` (AES-256-GCM, `ENCRYPTION_KEY`)
into `integration_connections.secret_enc` as one JSON blob, and every API response masks them as `••••••••`.
The list of stored secret keys is kept in `config.__secretKeys` (stripped from responses).

| Provider | Platform env (optional) | Workspace connection fields | Live test |
| --- | --- | --- | --- |
| github | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | none (per-user OAuth link) | n/a |
| postgres | — | `connectionString` (secret), `ssl` | `pg` connect + `select version()` |
| supabase | — | `projectUrl`, `anonKey`, `connectionString` (secret) | pg connect (TLS) + `GET {projectUrl}/rest/v1/` with `apikey` |
| openai | `OPENAI_API_KEY` | `apiKey` (secret) | `GET https://api.openai.com/v1/models` |
| anthropic | `ANTHROPIC_API_KEY` | `apiKey` (secret) | `GET https://api.anthropic.com/v1/models` |
| stripe | `STRIPE_SECRET_KEY` | `secretKey` (secret) | `GET https://api.stripe.com/v1/balance` |
| razorpay | `RAZORPAY_KEY_ID`/`_SECRET` | `keyId`, `keySecret` (secret) | `GET https://api.razorpay.com/v1/payments?count=1` |
| resend | `RESEND_API_KEY` | `apiKey` (secret) | `GET https://api.resend.com/domains` |
| vercel | `VERCEL_TOKEN` | `token` (secret), `teamId` | `GET https://api.vercel.com/v2/user` |

`GET /api/v1/integrations` returns each provider with `configured` (platform env present: `true`/`false`, or `null`
when the provider is only configured per workspace) and `connectable` (an adapter exists and status is `available`).

### Endpoints

```
GET    /api/v1/integrations?workspaceId=            → { providers, connections }   (member; connections only with workspaceId)
GET    /api/v1/workspaces/:id/integrations          → { connections }              (viewer)
POST   /api/v1/workspaces/:id/integrations          { provider, name, config, secret? } → 201 { connection }   (admin)
         `secret` is { fieldKey: value } or, for single-secret providers, the bare string.
GET    /api/v1/workspaces/:id/integrations/:cid     → { connection }               (viewer)
POST   /api/v1/workspaces/:id/integrations/:cid/test → { connection, result: { ok, message, details? }, ok, error } (editor)
DELETE /api/v1/workspaces/:id/integrations/:cid     → 204                          (admin)
```

Tests update `status` (`unverified | connected | error`), `lastTestedAt` and `lastError`. Test results never contain
secrets (pg error messages are scrubbed of `password=`).

## 2. GitHub

### OAuth app setup
1. Create an OAuth app at https://github.com/settings/developers with callback URL `<APP_URL>/api/auth/github/callback`.
2. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env` and restart. `capabilities.github` turns on.
3. Scopes requested: `repo read:user user:email`.

Routes:
- `GET /api/auth/github/start?next=/path` — signed in: links GitHub to the current account; signed out: sign-in/sign-up with
  GitHub (creates the user with `createUserWithWorkspace` using the verified primary email from `/user/emails`).
  Random `state` + `next` + mode are stored in the httpOnly cookie `codexa_gh_oauth` (10 min, path `/api/auth/github`).
  When not configured it returns **503** (JSON, or an HTML page when `Accept: text/html`).
- `GET /api/auth/github/callback?code=&state=` — validates state, exchanges the code, fetches `/user`, upserts
  `oauth_accounts` (token encrypted), links or signs in, then redirects to the safe `next` (same-origin paths only).
  Failures redirect to `/connect-github?error=<code>` (link mode) or `/login?error=github_<code>` (sign-in mode).
- `GET/DELETE /api/auth/github/account` — linked status / unlink (deletes the `oauth_accounts` row).

Project routes (all `assertProjectAccess` + rate limit `60/10min` per user; 503 `not_configured`, 412 `github_not_linked`):
```
GET    /api/v1/integrations/github/repos?q=&page=&perPage=   → { repos, page, hasMore, username }
GET    /api/v1/integrations/github/branches?repo=owner/name  → { branches, defaultBranch, canPush, htmlUrl }
POST   /api/v1/integrations/github/import { workspaceId, repo, branch?, name? } → 201 { project, imported, skipped, truncated, templateId }
POST   /api/v1/projects/:id/github/import { repo, branch? }  link an existing project + replace files (snapshot "Before pull" first)   (editor)
POST   /api/v1/projects/:id/github/pull   { branch? }        re-import the linked branch (snapshot "Before pull" first)              (editor)
POST   /api/v1/projects/:id/github/push   { message, branch? } → { committed, commitSha, commitUrl, added, changed, deleted }     (editor)
GET    /api/v1/projects/:id/github/status → { configured, account, project: { repo, branch }, status | null, error | null }      (viewer)
DELETE /api/v1/projects/:id/github        unlink (keeps files)                                                                  (editor)
```

Import reads the tree with `GET /repos/{o}/{r}/git/trees/{sha}?recursive=1` and each blob with
`GET /repos/{o}/{r}/git/blobs/{sha}` (base64), 8 in parallel. Skips `node_modules/.git/dist/build/.next/...`, binary
extensions, NUL/invalid-UTF-8 content, symlinks, files > 1 MB, and caps at 2000 files (`truncated: true`). The project
template is picked from `package.json` (`vite` → `vite-react-starter`, `express` → `node-express-api`, else `static-site`)
and `createProject({ files })` uses the imported files. Tarballs (`codeload.github.com`) are never used.

Push uses the Git Data API: blobs for changed files only (compared by git blob sha), a tree based on the branch head tree
with deletions for paths that were in the last synced tree but no longer exist locally, a commit with the message, then a
`PATCH refs/heads/<branch>` with `force: false`. A rejected ref update returns **409 `non_fast_forward`**; Codexa never
force-pushes. Sync markers live in `project.settings` (`githubLastTreeSha`, `githubLastCommitSha`, `githubLastSyncAt`)
via `updateProject` settings merge. Status compares local files with the last synced tree (or the head tree when never
synced) and reports `added/changed/deleted`, `aheadBy` (local change count) and `behindBy` (commits on GitHub since the
last sync, via `/compare`).

UI: `/connect-github` (scopes, linked account, unlink), `/dashboard/github` (repo list with Import), `/import-project`
(repo picker + branch select + workspace + name → `/projects/:id`), `GithubPanel` in the workspace (status lists,
commit box + "Commit & push" (Ctrl/Cmd+Enter), "Pull latest" with confirmation, unlink, link to the repo).

## 3. Database integration

Adapters: `src/lib/integrations/providers/postgres.ts` (`pg.Client`, `connectionTimeoutMillis: 5000`,
`statement_timeout: 15000`, optional SSL with `rejectUnauthorized: false`) and `supabase.ts` (always TLS + REST probe).

```
GET  /api/v1/projects/:id/database/schema?connectionId=  → { connection, schemas, tables: [{ schema, name, kind, rowEstimate, primaryKey, columns: [{ name, type, nullable, default, isPrimaryKey, foreignKey }] }] }  (viewer)
POST /api/v1/projects/:id/database/query { connectionId, sql, confirmDestructive? } → { rows, fields, rowCount, durationMs, command, truncated, readOnly }  (editor)
```

- The connection must belong to the project's workspace (404 otherwise); it must be a `postgres`/`supabase` connection.
- `src/lib/integrations/sql-safety.ts` tokenizes the SQL (comments, strings, dollar quotes and quoted identifiers removed)
  and classifies statements. `DROP`, `TRUNCATE`, `ALTER`, and `DELETE`/`UPDATE` **without `WHERE`** (anywhere in the
  statement, including CTEs) require `confirmDestructive: true`; otherwise **409 `{ code: 'confirmation_required', details: { reason } }`**.
  `FOR UPDATE`, `ON DELETE CASCADE`, `ON CONFLICT DO UPDATE` are not flagged.
- `SELECT/WITH/EXPLAIN/SHOW/VALUES/TABLE`-only input runs in `BEGIN READ ONLY`; everything else runs in a normal
  transaction (all-or-nothing). `set local statement_timeout = 15000`. Rows are capped at 500 (`truncated`).
- Query errors come back as 422 `query_failed` with the Postgres message (credentials scrubbed).

`DatabasePanel`: connection selector, "Add connection" dialog (fields from the provider definition, saved + tested),
schema browser (filter, tables → columns with PK/FK), SQL textarea (Ctrl/Cmd+Enter), results table, destructive
confirmation dialog, error display with **"Explain this error"**, and a **"Generate SQL with AI"** hint. Both AI buttons
dispatch `window.dispatchEvent(new CustomEvent('codexa:ai-ask', { detail: { text } }))` — a request for the AI owner to
listen for in `ChatPanel` (prefill or send the prompt). The event is dispatched raw because `src/lib/client/events.ts`
belongs to another owner; please add `"codexa:ai-ask": { text: string }` to `CodexaEvents`.

## 4. Realtime presence

- `GET /api/v1/projects/:id/realtime-token` (viewer) → `{ token, url, expiresAt, self }`. Token =
  `base64url(JSON{ projectId, userId, name, color, exp }) + '.' + HMAC-SHA256(sha256(SESSION_SECRET), payload)` —
  identical to `sign()` in `src/lib/crypto.ts`; 10 min expiry. `url` is `NEXT_PUBLIC_REALTIME_URL` or `null`.
- `services/realtime/index.ts` (`npm run realtime:dev` / `realtime:start`) loads `.env.local` then `.env` (same precedence
  as Next.js so the secret matches), listens on `REALTIME_PORT` (default 4200, `REALTIME_HOST` default 0.0.0.0) and serves
  `GET /health`. `services/realtime/server.ts` exports `createRealtimeServer({ port, secret })` used by the tests.
- Protocol: connect with `?token=`; server sends `welcome { self, peers }`, then `join`/`leave`/`presence` updates and
  relays `file-changed { paths }` and `cursor { path, line, column }` to the other clients in the project room. `ping` →
  `pong`. Limits: 16 KB per message (socket closed with 1009), 20 messages/second per client (`error rate_limited`, closed
  with 4008 after persistent abuse), 30 s heartbeat ping with cleanup of unresponsive sockets. Tokens are checked at
  connect time only.
- Client: `usePresence(projectId)` in `src/lib/client/presence.ts` (token fetch, auto-reconnect with exponential backoff
  up to 30 s, `peers[]`, `self`, `send()`, `subscribe()`, `status`). After three failed attempts without ever connecting
  the status is `unavailable` with the honest text "Realtime server not reachable".
- `Presence({ projectId, activeFile?, compact? })` in `src/components/workspace/presence.tsx`: "Live: N" indicator plus an
  avatar stack with names/active files; relays `codexa:open-file` and `codexa:files-changed` to peers. It is not mounted
  yet — the workspace owner should render it in `workspace-header.tsx` (see requests).

## 5. What is verified here vs. unverifiable

Verified in this sandbox:
- Postgres adapter, schema inspection and guarded queries against the real `codexa_test` database (integration tests +
  curl + Playwright through `DatabasePanel`, including the destructive confirmation and the `codexa:ai-ask` event).
- Workspace connection CRUD/test with encrypted secrets and masking (integration tests + curl).
- Realtime server: two WebSocket clients in one project see each other, isolation between projects, relay of
  `presence`/`file-changed`/`cursor`, rejection of bad tokens, rate limit and payload cap (integration test on a random
  port + a script against the running server on :4200 using a token issued by the API).
- GitHub client flows (list/search, import tree+blobs with skipping/truncation, push with blobs/tree/commit/ref,
  no-op push, 409 on non-fast-forward, status diff) with a mocked `fetch`; not-configured states on every route/page.

Unverifiable here (no OAuth app, outbound hosts blocked): the live GitHub OAuth round trip and real repository
import/push; the OpenAI, Stripe, Razorpay, Resend and Vercel connection tests (hosts return proxy 403 → the test reports
"Could not reach <host> from this server"); Supabase REST probe. `api.anthropic.com` and `api.github.com` are reachable
but no keys/tokens exist. These paths are implemented but unverified.

### Manual GitHub OAuth test plan
1. Configure the OAuth app and env vars (above), restart, open `/connect-github` → the "not configured" alert is gone.
2. Click **Connect GitHub** → GitHub consent screen shows `repo`, `read:user`, `user:email` → authorize → back on
   `/connect-github` with "Linked as @username". Check `oauth_accounts` has one row with `access_token_enc` starting `v1.`.
3. Sign out, visit `/api/auth/github/start` → GitHub → you are signed in; a new user gets a workspace and the verified
   primary email. Try again with an email that already has a password account → it signs into that account.
4. `/dashboard/github` lists repositories (search, Load more). Click **Import** → `/import-project` prefilled; choose a
   branch and workspace → project opens with the files; `project.github_repo/branch` are set and activity shows
   `github.imported`.
5. In the workspace GitHub panel: edit a file, refresh status → it appears under "Changed"; write a message, **Commit &
   push** → commit link opens on GitHub; status is clean. Delete a file → push → the file is removed upstream.
6. Push a commit from elsewhere, then push from Codexa → 409 "branch has new commits"; **Pull latest** → files update,
   a "Before pull" checkpoint exists in Version history; push again succeeds.
7. Deny the consent screen → `/connect-github?error=denied` shows "You cancelled…". Tamper with `state` → `invalid_state`.
8. **Unlink** → row deleted; GitHub routes answer 412 `github_not_linked`.
