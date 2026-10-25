---
title: Workspace and editor
description: Projects from templates, files in PostgreSQL, the Monaco editor with tabs, search and diagnostics, snapshots with diffs and restore, activity and share links.
category: Release
order: 2
version: 0.1.0
tags: [release, editor, projects, snapshots]
author: Codexa Team
date: 2026-10-24
related: [platform-foundation, ai-agent]
---

## Projects

- Starter templates in three families: React + Vite + TypeScript + Tailwind, static HTML/CSS/JS, Node + Express.
- Files stored in PostgreSQL with a per-workspace storage quota.
- Project settings, soft delete, duplicate (copies variable names, not values).
- Encrypted environment variables with masked reads and logged reveals.
- Share links with view or edit access and optional expiry.
- Activity history.

## Editor

- Monaco served from Codexa (no CDN), with tabs, file explorer, quick open (`Ctrl/Cmd+P`), in-file find/replace, project-wide search (`Ctrl/Cmd+Shift+F`), diagnostics for TypeScript/JavaScript/JSON/CSS, diff view, autosave and `Ctrl/Cmd+S`.

## Snapshots

- Named checkpoints with per-file diffs against the current files.
- One-click restore; the pre-restore state is kept as a snapshot.
- Automatic snapshot before every AI run.

## Collaboration

- Realtime presence over WebSockets showing who is viewing which file. Concurrent editing is not included; last save wins.

Documentation: [Projects](/docs/projects), [Editor](/docs/editor).
