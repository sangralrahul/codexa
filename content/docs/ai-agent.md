---
title: AI agent
description: How the Codexa agent plans, edits files with tools, validates in the sandbox, repairs errors, and how every run can be reviewed and reverted.
category: Build
order: 12
tags: [ai, agent, tools, repair, snapshots]
author: Codexa Team
date: 2026-10-24
related: [prompting, projects, troubleshooting]
---

The agent is a bounded, tool-using loop that works on the real files in your project. It never runs code inside Codexa's web server: anything that executes (installs, builds, tests) happens in the project's isolated sandbox through the runner service.

## Providers and configuration

Codexa has a provider abstraction with adapters for **Anthropic** and **OpenAI** models. The operator of a deployment configures an API key and a default provider/model; the agent panel shows which one is active. When no key is configured, the panel renders an explicit **not configured** state and `POST .../ai/generate` returns `ai_not_configured` instead of pretending to work.

Workspace-level connections for OpenAI and Anthropic (under Integrations) are stored encrypted and tested with a lightweight request when you add them.

## Modes

| Mode  | Tools available                         | Use it for                                        |
| ----- | --------------------------------------- | ------------------------------------------------- |
| Build | read, search, run commands, write, edit, delete, finish | New features and changes                 |
| Ask   | read, search, run commands              | Questions about the code; nothing is written      |
| Fix   | same as Build, with a repair-oriented prompt | Pasted errors and failing builds             |

## Stages of a run

Every run streams its progress as events (`stage`, `text`, `tool_call`, `tool_result`, `file_change`, `plan`, `usage`, `done`, `error`) over a server-sent-events connection. The stages are:

1. **queued** – the run row is created and your message is stored.
2. **loading_context** – the file tree, the most relevant files and the last ten messages of the conversation are gathered. Tool outputs are truncated to safe sizes and never include environment variable values.
3. **planning** – the model is given a single `propose_plan` tool and returns a short plan, shown in the panel.
4. **working** – the model calls tools in a loop. Before the first write a snapshot named `Before AI run <id>` is created.
5. **validating** – the agent runs allow-listed commands in the sandbox (`typecheck`, `build`, `test`) and reads the output.
6. **repairing** – if validation fails, the agent is shown the errors and tries again, at most **two** repair attempts.
7. **done** – the run ends as `succeeded`, `failed` or `cancelled`, with token usage recorded.

## Tools

The agent's tools are deliberately small:

- `list_files`, `read_file`, `search_files` – read access to the stored project files.
- `write_file`, `edit_file`, `delete_file` – changes, recorded as file changes on the run.
- `run_command` – one of `install`, `build`, `test`, `typecheck` in the sandbox. Arbitrary shell is not available.
- `get_logs` – recent runtime logs.
- `propose_plan`, `finish` – structure the run.

Paths are validated so the agent cannot read or write outside the project.

## Limits

| Limit                           | Value                       |
| ------------------------------- | --------------------------- |
| Prompt length                   | 8,000 characters            |
| Tool calls per run              | 40                          |
| Model turns per run             | 60                          |
| Wall-clock time per run         | 25 minutes                  |
| Output tokens per model call    | 16,000                      |
| Repair attempts                 | 2                           |
| Provider retries on transient errors | 2                      |

Runs also count against the workspace's monthly AI request and token quotas. When a quota is exhausted the run is refused with `quota_exceeded` (HTTP 402) before anything is sent to the provider.

## Review and revert

Each run links to the snapshot taken before it and to the list of files it changed.

- **Review** opens a per-file diff between that snapshot and the current files.
- **Revert** restores the snapshot. Changes you made by hand after the run are included in the revert, so review first.
- **Cancel** stops a running run at the next tool boundary; files already written stay, and the snapshot still lets you revert.

## Conversations

Conversations group messages per project. Only the last ten messages are sent as history, so long conversations do not grow the context without bound. Start a new conversation when you change topic.

## What the agent cannot do

- Deploy, change billing, invite members or touch workspace settings.
- Reach the network from the sandbox beyond what the sandbox policy allows for package installs.
- Read environment variable values; it sees names only.
- Run outside the sandbox's CPU, memory, process and time limits.
