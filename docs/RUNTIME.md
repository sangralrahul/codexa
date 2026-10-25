# Codexa runtime: sandboxes, previews, logs and deployments

The runtime is a separate Node process (`services/runner`) that runs user projects in isolated
sandboxes, proxies live previews, streams logs and builds/serves Codexa-hosted static sites.
The Next.js app never executes project code; it talks to the runner over a token-protected
HTTP API (`src/lib/runtime/client.ts`).

```
browser ──(iframe)──► http://<token>.preview.localhost:4100  ─┐
browser ──(fetch)───► Next.js /api/v1/projects/:id/runtime/*  │
                           │  RUNNER_URL + RUNNER_TOKEN        │
                           ▼                                   ▼
                    runner control API :4000        preview/sites proxy :4100
                           │                                   │
                    SessionManager / DeploymentManager         │ Host header routing
                           │                                   │
                    sandbox driver (local | docker | e2b) ◄─────┘ 127.0.0.1:<port>
                           │
          /var/codexa/sandboxes/<id>/project   (bind-mounted at /work/project)
```

## Running it

```
npm run runner:prepare   # once: installs prebuilt dependency sets (needs npm registry access)
npm run runner:dev       # tsx watch services/runner/index.ts
npm run runner:start     # production
```

Environment (read from the repo `.env`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `RUNNER_PORT` / `RUNNER_BIND` | `4000` / `127.0.0.1` | control API (bearer `RUNNER_TOKEN`) |
| `RUNNER_PREVIEW_PORT` / `RUNNER_PREVIEW_BIND` | `4100` / `127.0.0.1` | preview + sites proxy |
| `RUNNER_TOKEN` | required | shared secret with the web app |
| `RUNNER_DATA_DIR` | `/var/codexa` | `sandboxes/`, `sites/`, `base/`, `bin/` |
| `RUNNER_SANDBOX_DRIVER` | `local` | `local`, `docker`, `e2b` |
| `RUNNER_SANDBOX_UID/GID` | `65534` | uid the sandbox runs as (nobody) |
| `RUNNER_NODE_BIN` | `/opt/node22/bin/node` | node binary exposed inside the sandbox |
| `PREVIEW_HOST` / `DEPLOY_HOST` | `preview.localhost:4100` / `sites.localhost:4100` | public hosts (port is what browsers use) |
| `RUNNER_MEMORY_BYTES`, `RUNNER_PIDS_MAX`, `RUNNER_CPU_SECONDS`, `RUNNER_FSIZE_BYTES`, `RUNNER_NOFILE` | 1 GiB, 256, 3600 s, 256 MiB, 4096 | per-sandbox limits |
| `RUNNER_EXEC_TIMEOUT_MS` / `RUNNER_BUILD_TIMEOUT_MS` | 120 s / 600 s | wall-clock timeouts (whole process group is killed) |
| `RUNNER_IDLE_TIMEOUT_MS` / `RUNNER_MAX_SESSION_AGE_MS` | 30 min / 6 h | sweeper thresholds |
| `RUNNER_PORT_RANGE_START/END` | 20000–29999 | dev-server ports |
| `RUNNER_REAP_ORPHANS` | `1` | on startup, kill sandboxes left in `codexa/*` cgroups by a crashed runner (tests pass `reapOrphans: false`) |
| `RUNNER_FORWARD_PROXY_ENV=1`, `RUNNER_SANDBOX_CA_FILE` | off | forward HTTP(S)_PROXY and a CA file into sandboxes (CI containers only) |

Browsers resolve `*.localhost` to `127.0.0.1`, so `http://<token>.preview.localhost:4100` works
with no DNS setup. For curl use `--resolve <host>:4100:127.0.0.1` or a `Host:` header.

## Control API (`services/runner/app.ts`)

All routes except `GET /health` require `Authorization: Bearer $RUNNER_TOKEN`. Bodies are JSON (96 MB cap).

| Method & path | Body → result |
| --- | --- |
| `GET /health` | driver, cgroup availability, base sets, session counts |
| `POST /sessions` | `{ projectId, framework, settings, files: {path: content}, env, previewToken }` → `{ id, port, previewUrl, status, session }` |
| `GET /sessions/:id[?heartbeat=1]` | `{ session: { status, port, previewUrl, startedAt, lastActivityAt, exitCode, error } }` |
| `PUT /sessions/:id/files` | `{ files, deletes }` → `{ written, deleted }` (atomic writes, unchanged files skipped) |
| `POST /sessions/:id/exec` | `{ command: install\|build\|typecheck\|test\|lint, timeoutMs? }` → `{ exitCode, output (≤64 KB), timedOut, durationMs, skipped }` |
| `GET /sessions/:id/logs` | SSE: `log {ts, stream, line}` (buffered 2000 lines + live), `status` every 5 s |
| `GET /sessions/:id/logs?tail=N` | `{ lines, status }` |
| `DELETE /sessions/:id` | kill process group + cgroup, remove directory |
| `POST /deployments` | `{ projectId, deploymentId, framework, settings, files, slug }` → `{ url, log, fileCount, durationMs }`; `422 { error, log }` on build failure |
| `POST /deployments/alias` | `{ slug, deploymentId }` → rollback / re-point |
| `GET /deployments/:id/log` | persisted build log |

Session statuses: `starting → running → exited | error | stopped`. A session becomes `running` when
the dev server accepts TCP connections on its port (120 s budget). The sweeper (every minute) stops
sessions idle for 30 min, older than 6 h, or whose dev server exited >10 min ago; all sessions are
killed on `SIGTERM`/`SIGINT`.

Preview URLs are `http(s)://<previewToken>.<PREVIEW_HOST>/`. The token is generated on the Next.js
side (`crypto.randomBytes(12)`, 24 hex chars, 96 bits) and stored on `runtime_sessions.preview_token`;
the proxy only forwards hosts whose label matches a live session, so a preview is unguessable and dies
with its session.

## The sandbox (local driver)

`services/runner/sandbox/local.ts` + `command.ts`. Every process the runner starts for a project
goes through this chain, built by the pure `buildLocalCommand()` (unit-tested for the absence of
escalating flags):

```
sh -c 'echo $$ > /sys/fs/cgroup/memory/codexa/<id>/cgroup.procs;   # memory.limit_in_bytes (+memsw)
       echo $$ > /sys/fs/cgroup/pids/codexa/<id>/cgroup.procs;     # pids.max
       exec prlimit --cpu --fsize --nofile --
            setpriv --reuid=65534 --regid=65534 --clear-groups --inh-caps=-all --no-new-privs --
            unshare -r -m -p --fork --kill-child --mount-proc --
            sh /var/codexa/bin/sandbox-init.sh sh -c "<command>"'
```

`sandbox-init.sh` runs as the mapped root of a fresh user namespace and builds a minimal root:
read-only recursive binds of `/usr /lib /lib64 /bin /sbin /etc` and `/opt/node22`, a tmpfs `/tmp`
(`HOME=/tmp`), a tmpfs `/dev` with only `null zero urandom random tty` + `shm`, the project directory
read-write at `/work/project`, the prebuilt dependency sets read-only at `/work/base` and helper scripts
at `/work/bin`. It `pivot_root`s into that tree, mounts a private `/proc`, unmounts the old root and
finally `exec unshare -U --map-user=65534` so the command does not run as namespace root.

Verified on this machine (see `tests/integration/runner/runner-e2e.test.ts` and the probe in the
report): inside the sandbox `id -u` is 65534, the process is pid 1 of its own pid namespace, `/home`
and the repository `.env` do not exist, `/usr` is read-only, a memory hog is killed by the cgroup,
and a `sleep 30` with a 1.5 s timeout returns `exitCode 124, timedOut: true`.

**The network namespace is deliberately shared with the host.** The preview proxy reaches dev
servers on `127.0.0.1:<port>` and dev servers need the registry for `install`. This is the main
limitation of the local driver (see hardening below): a sandboxed process can reach anything the host
can, including other sandboxes' ports and the runner API (which still requires the bearer token).

Other properties:

- `env` passed to a session is sanitised (`sanitizeEnv`): POSIX keys only, `PATH/HOME/PORT/HOST/LD_*/NODE_OPTIONS/CODEXA_*` cannot be overridden. Nothing from the runner's own environment leaks in (explicit allowlist in `LocalDriver.envFor`).
- File paths are validated (`safeRelativePath`): no absolute paths, `..`, NUL, backslashes or `node_modules`; `resolveInside()` re-checks the resolved path. The same validation applies to deletes and `outputDir`.
- Exec is an allowlist (`lib/allowlist.ts`): `install|build|typecheck|test|lint` map to fixed npm scripts / `tsc --noEmit`; caller-supplied shell is never accepted. Project `settings.buildCommand`/`installCommand` are honoured but run inside the sandbox like any user code.
- Output of exec is truncated to 64 KB keeping head and tail; log lines are capped at 8 KB and 2000 lines per session.
- Static projects are served by `bin/static-server.cjs`, a tiny file server shipped by the runner and executed *inside* the sandbox with the same privileges as user code.

### Prebuilt dependency sets (`prepare.ts`)

`npm run runner:prepare` installs `base/vite-react` and `base/node-express` from the `package.json` of
the corresponding template, chowns them to the sandbox uid and writes `base/manifest.json` with every
installed version. A new session gets `node_modules/` as **one symlink per package** pointing at
`/work/base/<framework>/node_modules/<pkg>` (plus `.bin`). Trade-offs:

- Start time is milliseconds and disk use is shared; templates run without any install.
- Per-package links (instead of linking the whole directory) keep `node_modules` itself writable so Vite can create `node_modules/.vite`.
- Version ranges are not compared: the base set is what the template declared. `depsCoveredByBase()` only checks package *names*; a project pinning other versions should run `install`.
- `install` (`installPrelude`) replaces the links with a private `cp -a` copy and runs `npm install`, so custom dependencies work at the cost of a real copy. On hosts without registry access the copy succeeds and only new packages fail (clearly, in the logs).
- Deployments reuse the same mechanism and skip `npm install` entirely when every dependency is covered.

## Preview + sites proxy (`services/runner/proxy.ts`)

One `http-proxy` instance with WebSocket upgrade support (Vite HMR verified end to end).
Routing is by `Host` only (`lib/hosts.ts`):

- `<token>.<PREVIEW_HOST>` → `http://127.0.0.1:<session port>`; `503` with auto-refresh while starting, `503` with the error when the dev server died, `404` when no session matches. Each hit refreshes `lastActivityAt`.
- `<slug>.<DEPLOY_HOST>` → static files from `sites/<alias target>` with correct content types, `public, max-age=31536000, immutable` for content-hashed assets (`/assets/index-7rrAqaCh.js`), `must-revalidate` otherwise, SPA fallback to `index.html` for extension-less paths that accept HTML, `GET/HEAD` only, path traversal blocked.
- Anything else → a clean 404 page.

Security headers: `x-content-type-options: nosniff`, `referrer-policy`; sites additionally get
`content-security-policy: frame-ancestors 'self' <APP_URL>` and a restrictive `permissions-policy`;
HSTS when `PREVIEW_PROTOCOL=https`. Previews are left as the dev server sends them (HMR needs it) and
are embedded by the Preview panel with `sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals allow-downloads"`.

## Next.js side

- `src/lib/runtime/client.ts`: typed client, 2 s cached health check, `RunnerUnavailableError` (503 `runner_unavailable`) when the process is down, 401 from the runner is reported as a server misconfiguration (token mismatch).
- `src/lib/services/runtime.ts`: one active session per project (`runtime_sessions`), plan `concurrentRuntimes` (402 `quota_exceeded`, kind `concurrent_runtimes`) and `runtime_minutes` quota via `assertQuota`. Decrypted `project_env_vars` go to the runner only; the browser DTO never includes them. Runtime minutes are recorded on every heartbeat (`GET /runtime`, every ≥5 min) and the remainder on stop. `reconcile()` maps runner state back to the row and closes rows whose sandbox was swept.
- `src/lib/runtime/exec.ts`: `execInProject` (starts a runtime if needed, syncs files, runs the command), `getRuntimeStatus`, `getRuntimeLogs` for the AI engine.
- Routes: `POST runtime/start` (editor, rate-limited 30/min), `POST runtime/stop`, `GET runtime` (viewer; heartbeat), `GET runtime/logs` (SSE relay or `?tail=N`), `POST runtime/sync { paths? }`, `POST runtime/exec { command }` (60/min).
- Deployments (`src/lib/services/deployments.ts`): `createDeployment` checks a verified email, provider availability, no in-flight build, `assertQuota('deployment')`, takes a `deploy` snapshot, records usage and activity, inserts `queued`. `runDeployment` moves it `building → live | failed` with the full build log, supersedes the previous live deployment (`rolled_back`) and runs after the response via `after()` (or inline with `{ wait: true }`). Rollback (admin/owner) re-points the alias. Site slug = `<workspace slug>-<project slug>` (≤63 chars, unique per project).
- Providers (`src/lib/deploy/`): `codexa` (static output only: `static` and `vite-react`; server frameworks are refused with a clear message) and `vercel` (`v13/deployments` with inline files, polling `readyState`, `v3/.../events` for logs, alias for rollback). **Vercel is gated by `VERCEL_TOKEN` and could not be exercised here** (api.vercel.com is blocked in the authoring environment); treat it as implemented-but-unverified.
- `GET /api/v1/status`: database probe, runner health (degraded when cgroups are unavailable), AI/email configuration (never probing providers).
- Panels: `PreviewPanel` (status, Start/Stop/Restart, viewport toggles, reload, open in new tab, starting/error/unavailable states, debounced `runtime/sync` on `codexa:files-changed`, emits `codexa:runtime-status`, listens to `codexa:run-command`, emits `codexa:ai-fix-request { error, logs }` from the "Ask AI to fix" button), `LogsPanel` (xterm.js with stdout/stderr/system colouring, `<pre>` fallback, clear/copy/autoscroll) and `DeployPanel` (provider select with "not configured" reasons, confirmation dialog, live status + build log, history with URLs and Restore, CNAME instructions; domain verification is explicitly marked as not implemented).

## Drivers

| Driver | Status | Isolation |
| --- | --- | --- |
| `local` | fully working and tested here | user/mount/pid namespaces, pivot_root, cgroup v1 memory+pids, prlimit, uid nobody; **shared network** |
| `docker` | implemented, **unverified** (no daemon in the authoring environment) | `docker run --rm --read-only --cap-drop=ALL --security-opt=no-new-privileges --user --memory --memory-swap --pids-limit --cpus --network=bridge`, ports published on 127.0.0.1 only, project/base/bin volumes |
| `e2b` | integration boundary only | refuses to start with a clear message (`E2B_API_KEY` missing / SDK not wired) |

`createRunner()` accepts config overrides so tests start the service in-process on ephemeral ports
with a private data directory.

## Production hardening list

1. **Use the docker driver (or Firecracker/E2B) per tenant** so each sandbox has its own network namespace. With the local driver sandboxes share the host network: add at minimum an egress firewall (nftables) that allows only the npm registry and blocks the metadata service, the database, the runner API and other sandboxes' ports.
2. **cgroup v2 with a delegated subtree** (`/sys/fs/cgroup/codexa/<tenant>/<session>`), `memory.max`, `pids.max`, `cpu.max` and `io.max`; v1 is what this host exposes and is deprecated.
3. **seccomp** profile (docker default or a tighter one): deny `ptrace`, `mount`, `keyctl`, `bpf`, `userfaultfd`, `unshare`, `io_uring_*`; `--security-opt=no-new-privileges` is already set for docker.
4. **Disk quotas** per sandbox (project volume on a size-limited filesystem/`xfs` project quota) in addition to `RLIMIT_FSIZE`; cap `sites/` per workspace against `storageMb`.
5. **Separate hosts** for the runner and the web app; keep the control API on a private network, rotate `RUNNER_TOKEN`, and put previews/sites behind TLS with a wildcard certificate (`PREVIEW_PROTOCOL=https`).
6. **Public-site hygiene**: rate limiting and abuse reporting on `<slug>.<DEPLOY_HOST>`, a `robots.txt` policy, and `frame-ancestors` already restricts embedding.
7. **Multi-runner scheduling**: sessions are in-memory per runner; for more than one host, pin a project to a runner (store the runner URL on `runtime_sessions`) or move session state to Redis.
8. **Image/base-set updates**: rebuild `base/` on a schedule from the templates and record `manifest.json` versions; sessions link the set that existed when they started.
9. **Custom domains**: the verification endpoint is not implemented; add DNS TXT verification + ACME (per-domain certificates) before enabling `customDomains` on paid plans.
10. **Observability**: export session counts, OOM kills (`memory.oom_control`), build durations and sweeper actions as metrics; the `/health` payload already contains the inputs.

## Tests

```
npx vitest run tests/unit/runner          # command builder, docker args, ports, allowlist, host routing, paths, buffers, deploy adapters
npx vitest run tests/integration/runner   # in-process runner (static + vite sessions, proxy, WS, exec, SSE, sweeper, deployments, rollback)
                                          # and the Next.js routes against it (real test DB, quotas, usage, activity, rollback, status)
```

The integration tests need Linux, root and the prepared base sets; they skip themselves otherwise.
