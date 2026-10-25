---
title: AI agent
description: Provider abstraction for Anthropic and OpenAI, Build/Ask/Fix modes, tool-based edits, sandbox validation, a two-attempt repair loop and streamed progress.
category: Release
order: 3
version: 0.1.0
tags: [release, ai, agent]
author: Codexa Team
date: 2026-10-24
related: [workspace-and-editor, runtime-and-previews]
---

## What ships

- Provider abstraction with adapters for Anthropic and OpenAI, plus a mock provider for tests. The operator configures the key and default model; without a key the product shows a **not configured** state and the API returns `ai_not_configured`.
- Modes: **Build** (full tools), **Ask** (read-only tools), **Fix** (repair prompt).
- Tools: `list_files`, `read_file`, `search_files`, `write_file`, `edit_file`, `delete_file`, `run_command` (allow-listed `install`/`build`/`test`/`typecheck`), `get_logs`, `propose_plan`, `finish`.
- Stages streamed over SSE: `queued`, `loading_context`, `planning`, `working`, `validating`, `repairing`, `done`; events `stage`, `text`, `tool_call`, `tool_result`, `file_change`, `plan`, `usage`, `done`, `error`.
- Bounds per run: 8,000-character prompt, 40 tool calls, 60 turns, 25 minutes, 16k output tokens per call, 2 repair attempts, 2 provider retries.
- Snapshot before the first write; review diff, revert and cancel.
- Conversations per project with the last ten messages as history.
- Usage recorded against workspace AI request and token quotas, checked before the provider is called.

Documentation: [AI agent](/docs/ai-agent), [Generations API](/api/generations).
