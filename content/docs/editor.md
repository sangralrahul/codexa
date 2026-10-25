---
title: Editor
description: The Monaco-based editor - tabs, explorer, search and replace, diagnostics, diff view, autosave and keyboard shortcuts.
category: Build
order: 11
tags: [editor, shortcuts, monaco]
author: Codexa Team
date: 2026-10-24
related: [projects, ai-agent, troubleshooting]
---

Codexa's editor is built on Monaco, the editor component from VS Code, served from Codexa itself (never from a third-party CDN). It edits the files stored in your project; a running sandbox receives the saved content.

## Layout

- **File explorer** on the left: create, rename, move and delete files and folders. Dragging a file onto a folder moves it.
- **Tabs** across the top of the editor. Unsaved tabs show a dot; middle-click or `Ctrl/Cmd+W` closes a tab.
- **Panels** on the right or bottom: agent chat, preview, logs, history, deploy, database and GitHub. Panels are resizable and remember their size per browser.

## Saving

- `Ctrl/Cmd+S` saves the active file immediately.
- Autosave writes the file about a second after you stop typing. If a save fails (network, permission, quota) the tab keeps its unsaved marker and an error toast explains why.
- Viewers can open files but cannot save; the editor is read-only for them.

## Search and replace

- `Ctrl/Cmd+F` searches inside the open file; `Ctrl/Cmd+H` opens replace.
- `Ctrl/Cmd+Shift+F` searches across every file in the project (server-side, over stored files). Results show path, line and the matching text; clicking one opens the file at that line.
- `Ctrl/Cmd+P` is quick open: type part of a path to jump to a file.

## Diagnostics

TypeScript, JavaScript, JSON and CSS get in-editor diagnostics from Monaco's language services (syntax errors and basic type information). The authoritative check is still the sandbox: **Run type-check** in the Logs panel executes `tsc` against the real dependencies and reports the full output.

## Diff view

The History panel opens any snapshot in a side-by-side diff against the current file. AI runs open the same view, scoped to the files the run changed. The diff is read-only; make edits in the normal tab.

## Keyboard shortcuts

| Shortcut                | Action                                     |
| ----------------------- | ------------------------------------------ |
| `Ctrl/Cmd+S`            | Save the active file                       |
| `Ctrl/Cmd+P`            | Quick open a file by path                  |
| `Ctrl/Cmd+Shift+F`      | Search across all files                    |
| `Ctrl/Cmd+F`            | Find in file                               |
| `Ctrl/Cmd+H`            | Find and replace in file                   |
| `Ctrl/Cmd+W`            | Close tab                                  |
| `Ctrl/Cmd+K`            | Open site search (outside the editor)      |
| `Ctrl/Cmd+/`            | Toggle line comment                        |
| `Alt+Up` / `Alt+Down`   | Move line up / down                        |
| `Shift+Alt+F`           | Format document (for languages Monaco supports) |
| `F8`                    | Jump to next diagnostic                    |

Monaco's standard shortcuts (multi-cursor, column select, go to line with `Ctrl/Cmd+G`) all work as in VS Code.

## Languages

Syntax highlighting and basic diagnostics are available for TypeScript, JavaScript, JSX/TSX, JSON, HTML, CSS, Markdown, YAML, SQL and shell. Other files open as plain text.

## Limits

- Files larger than a few megabytes open read-only to keep the browser responsive.
- Monaco needs a modern browser; see [browser support](/browser-support).
