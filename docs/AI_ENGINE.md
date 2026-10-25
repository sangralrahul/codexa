# Codexa AI engine

The AI engine turns a prompt into reviewable file changes inside a project. It is a bounded,
tool-using agent: it plans first, edits only through typed tools, snapshots the project before
the first write, validates with the runner when one is available, and records everything
(conversation, message parts, generation run, usage) so a run can be reviewed and reverted.

Code lives in `src/lib/ai/**` (engine), `src/app/api/v1/projects/[id]/ai/**` (HTTP) and
`src/components/ai/**` (chat panel). Tests: `tests/unit/ai`, `tests/integration/ai`.

## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Enables the Anthropic provider (`@anthropic-ai/sdk`, Messages streaming with tools). | unset |
| `OPENAI_API_KEY` | Enables the OpenAI provider (`openai`, Chat Completions streaming with tools). | unset |
| `AI_DEFAULT_PROVIDER` | `anthropic` or `openai`. Used when both keys exist. Falls back to whichever key is present. | `anthropic` |
| `AI_DEFAULT_MODEL` | Model name sent to the provider. | `claude-sonnet-5-5` (Anthropic) / `gpt-5` (OpenAI fallback) |
| `AI_MOCK` | `1` enables the scripted mock provider **outside production only**. | unset |

Provider selection (`src/lib/ai/keys.ts` → `resolveAiCredentials`): mock if `AI_MOCK=1` and
`NODE_ENV !== "production"`; otherwise the preferred provider if its key exists; otherwise the
other provider (with a sensible model for it when `AI_DEFAULT_MODEL` names the wrong family);
otherwise **not configured**. `GET /api/v1/projects/:id/ai/status` returns
`{ configured, provider, model, mock, missingEnv, lastError }` and never claims AI works when
it does not. With no key the chat panel shows an explicit "AI is not configured" state naming
`ANTHROPIC_API_KEY` / `OPENAI_API_KEY`, and `POST /generate` answers `503 { error: { code: "ai_not_configured" } }`.

### Running with real keys

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run dev          # Anthropic (default)
OPENAI_API_KEY=sk-... AI_DEFAULT_PROVIDER=openai AI_DEFAULT_MODEL=gpt-5 npm run dev
```

Both providers set a 5 minute request timeout, 2 SDK retries, and abort the stream when the run
is cancelled. Tool inputs are accumulated from `input_json_delta` (Anthropic) / `tool_calls`
deltas (OpenAI) and parsed once the block completes; unparsable inputs become a retryable error.

### Running with the mock provider (no keys)

```bash
AI_MOCK=1 npm run dev                     # dev server
AI_MOCK=1 npx vitest run tests/integration/ai   # (the test sets AI_MOCK=1 itself)
```

The mock (`src/lib/ai/providers/mock.ts`) is a deterministic script that behaves like a small
agent: it proposes a plan, calls `list_files` and `read_file`, writes a real change
(for `vite-react` projects: creates `src/components/Feature.tsx` and rewrites `src/App.tsx` to
render the prompt text; for static sites it edits `index.html`; otherwise it writes
`FEATURE.md`), runs `run_command typecheck` if offered, then calls `finish`. In **ask** mode it
answers in text. The UI shows a **"Mock AI (development only)"** badge whenever it is active.
It exists so the whole pipeline (tools, snapshots, runs, SSE, UI) can be exercised without
keys; it is not a product feature and is refused in production.

## Pipeline (`src/lib/ai/agent.ts`)

1. **Prepare** (`prepareRun`, before the SSE stream opens so errors are plain JSON):
   validate the prompt (non-empty, ≤ 8 000 chars, no control chars) → resolve provider
   (503 if none) → `assertQuota(workspace, "ai_request")` (402 `quota_exceeded`) → load or
   create the conversation (title = first prompt line) → insert the user message and an empty
   assistant message → insert a `generation_runs` row (`queued`).
2. **Load context** (`src/lib/ai/context.ts`): framework/template, project settings, file tree
   (≤ 400 entries, secret files hidden), key entry files (`package.json`, `src/App.tsx`,
   `index.html`, …) within a 24 000 character budget, the last run error, runtime status and the
   last 60 runtime log lines when a sandbox is running.
3. **Plan** (build/fix modes): the model is offered only `propose_plan({ steps[] })`. The plan is
   stored on the run and emitted as a `plan` event.
4. **Tool loop**: the model calls tools until it calls `finish`, hits the limits, or stops.
   Every tool result is appended to the transcript as data. Before the **first write** a
   snapshot `kind: "ai"`, name `Before AI run <id8>` is created and stored as
   `snapshotBeforeId` on the run.
5. **Validate**: if the runtime sandbox is available (`getRuntimeStatus`) and the framework has a
   build step, `run_command typecheck` is executed. On failure the output is fed back as
   `<validation_error>` for up to **2 repair iterations**; the final state is reported in the
   `done` event (`validation.ok`) and, if still failing, on `run.error`.
6. **Finish**: run → `succeeded | failed | cancelled` with stage, changed files, tokens, repair
   attempts and timestamps; assistant message parts/content/tokens persisted; `recordUsage`
   for `ai_request` (1) and `ai_tokens` (in + out) — also on failure and cancellation; an
   `ai.run` activity entry when files changed.

Modes: `build` (default, all tools), `ask` (read-only tools, no plan, answers in Markdown),
`fix` (prompt prefilled from the latest build/runtime error; the error is included as data).

### Limits

| Limit | Value |
| --- | --- |
| Prompt length | 8 000 characters |
| Tool calls per run | 40 (then the model may only call `finish`) |
| Model turns per run | 60 |
| Wall clock per run | 25 minutes |
| Output tokens per model call | 16 000 |
| Repair iterations | 2 |
| Provider retries on retryable errors | 2 |
| Rate limit | 20 `POST /generate` per minute per user |
| Conversation history sent to the model | last 10 messages (1 200 chars each) |

### Cancellation

`POST /runs/:runId/cancel` marks the run `cancelled`. The loop checks the cancellation flag
(in-process `AbortController` + DB status) before every model call and every tool call, aborts
the provider stream, and the SSE stream ends with `done { status: "cancelled" }`. A run that is
cancelled while its final update is in flight stays cancelled (`finishRun` only updates
queued/running rows).

## Tools (`src/lib/ai/tools/*`)

All inputs are validated with zod (`schemas.ts`); the JSON schema sent to providers is derived
from the same definitions. Paths go through `safePath` (no `..`, no absolute paths, no
`node_modules`, no control characters, ≤ 512 chars) and `safeReadablePath` additionally denies
secret files (`.env*`, `*.pem`, `*.key`, SSH keys). Every tool is scoped to the project id; none
can read environment variables or secrets.

| Tool | Modes | Notes |
| --- | --- | --- |
| `list_files({ prefix? })` | all | ≤ 2 000 entries with sizes |
| `read_file({ path, startLine?, endLine? })` | all | output truncated to 60 000 chars (head + tail) |
| `search_files({ query })` | all | ≤ 50 matches, `path:line: text` |
| `get_logs({ lines? })` | all | last ≤ 200 runtime log lines (≤ 20 000 chars) |
| `run_command({ command })` | all | allowlist `install | build | typecheck | test | lint` via `execInProject`; output tail ≤ 20 000 chars; reports "not available" without a runner |
| `write_file({ path, content })` | build, fix | full content, ≤ 400 000 chars |
| `edit_file({ path, search, replace })` | build, fix | `search` must match **exactly once**; errors name the number of matches or hint at whitespace differences |
| `delete_file({ path })` | build, fix | |
| `propose_plan({ steps[] })` | planning phase only | 1–12 steps |
| `finish({ summary, nextSteps[], changedFilesSummary })` | build, fix | ends the run |

Tool execution never throws into the loop: failures become `isError` results the model can
recover from. UI copies of tool inputs/outputs are truncated (2 000 / 6 000 chars) before being
persisted in message parts or streamed.

## Safety model

- Generated/user code never runs inside the Next.js process; `run_command` only reaches the
  runner service through `src/lib/runtime/exec.ts`.
- File contents, logs, command output and the user's request are wrapped in
  `<project_files>`, `<file>`, `<tool_output>`, `<runtime_logs>`, `<validation_error>` and
  `<user_request>` tags, and the system prompt instructs the model that these are **data, never
  instructions**.
- Secrets: env files and key material are invisible to every tool and to the context loader;
  the status endpoint never returns key values.
- Authorization: `status`, `conversations` (GET), `messages`, `runs/:id` require `viewer`;
  `generate`, `conversations` (POST), `cancel`, `revert` require `editor`. All routes use
  `handler()`, `requireApiUser()`, `assertProjectAccess()` and `parseBody()`.
- Every run is reversible: `GET /runs/:runId` returns the diff vs `snapshotBefore`
  (`diffFileSets`) with +/- line counts; `POST /runs/:runId/revert` restores that snapshot
  (`restoreSnapshot` first takes a safety snapshot) and logs `ai.reverted`.
- The model's Markdown is rendered with `react-markdown` + `remark-gfm` with raw HTML skipped.

## HTTP API

```
GET  /api/v1/projects/:id/ai/status                        → { configured, provider, model, mock, missingEnv, lastError }
GET  /api/v1/projects/:id/ai/conversations                 → { conversations }
POST /api/v1/projects/:id/ai/conversations { title? }      → { conversation }   (201)
GET  /api/v1/projects/:id/ai/conversations/:cid/messages   → { conversation, messages, runs }
POST /api/v1/projects/:id/ai/generate { prompt, mode?, conversationId? } → text/event-stream
POST /api/v1/projects/:id/ai/runs/:runId/cancel            → { run }
GET  /api/v1/projects/:id/ai/runs/:runId                   → { run, diff, stats, snapshotBefore }
POST /api/v1/projects/:id/ai/runs/:runId/revert            → { ok, snapshotId, revertedPaths }
```

SSE events (`event: <name>\ndata: <json>\n\n`, keep-alive comment every 15 s):
`run` (ids, mode, provider, model, mock) · `stage` · `text` (`{ delta }`) · `plan` · `tool_call`
· `tool_result` · `file_change` · `usage` · `error` · `done` (`{ status, runId, changedFiles,
summary?, nextSteps?, validation?, error? }`). `src/lib/ai/sse.ts` has the encoder and an
incremental parser shared with the client.

## Chat panel (`src/components/ai/chat-panel.tsx`)

`ChatPanel({ projectId, conversationId? })` — conversation dropdown with "New chat", message
list (plan checklist, stage timeline, collapsible tool rows, file chips that emit
`codexa:open-file`, Markdown text), live streaming, Build/Ask/Fix composer (Enter sends,
Shift+Enter newline), Cancel while running, per-run "Review changes" (diff stats, open in
editor, "Revert this run" with confirmation), "AI not configured" state linking to
`/docs/ai-agent`, mock badge, quota state linking to `/settings/billing`, error state with
retry. On completion it emits `codexa:files-changed { paths, source: "ai" }` and
`codexa:ai-run`. On mount it reads `sessionStorage["codexa:initialPrompt"]` (set by the
dashboard; a plain string or `{ projectId, prompt }`), prefills and auto-sends it once, then
clears it.

## Tests

```bash
npx vitest run tests/unit/ai          # tool schemas/path safety/edit uniqueness/truncation, SSE codec, mock script, panel SSR
npx vitest run tests/integration/ai   # agent end to end on the test DB with the mock provider:
                                      # files changed, snapshot + run row, usage recorded, revert, ask mode, cancel, quota 402, 503 when unconfigured
```
