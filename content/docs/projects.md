---
title: Projects
description: Project structure, templates, settings, files, snapshots, activity history and share links.
category: Build
order: 10
tags: [projects, snapshots, templates, files]
author: Codexa Team
date: 2026-10-24
updated: 2026-10-27
related: [editor, environment-variables, github]
---

A project is the unit everything else attaches to: files, snapshots, activity, environment variables, AI conversations, runtimes and deployments. Projects belong to a workspace and inherit its members and roles.

## Creating projects

Projects start from a **template** or a **GitHub import**.

- Templates are starter codebases in three families: React + Vite + TypeScript + Tailwind single-page apps, static HTML/CSS/JS sites, and Node + Express REST APIs. Browse them at [/templates](/templates). A Next.js full-stack template is on the [roadmap](/roadmap) and is not available yet.
- GitHub import copies a repository branch into a new project once GitHub is connected. See [GitHub](/docs/github).

The number of active projects per workspace is limited by plan (3 on Free, 25 on Pro, 100 on Team). Creating one beyond the limit returns `quota_exceeded`.

## Files

Files are stored in Codexa's database (Cloudflare D1), not on a disk you can see. The file explorer, search (`Ctrl/Cmd+Shift+F`) and the agent's tools all operate on this stored copy; a running sandbox receives a synced copy of it.

- Paths are relative to the project root and may not contain `..` segments.
- A file can be up to 1 MB and a project can hold up to 2,000 files. Binary files are supported for small assets; large media belongs in object storage or a CDN.
- Deleting a folder deletes every file under it. Deletions are recorded in activity and recoverable from a snapshot taken before the deletion.

Storage per workspace is metered against the plan's limit (250 MB on Free).

## Snapshots

A snapshot is a named checkpoint of every file in the project. Its contents are stored in Cloudflare R2; the database keeps the snapshot's name, file count and size.

- Create one from the History panel with a name and optional message.
- The agent creates one automatically before each run, named `Before AI run <id>`.
- Opening a snapshot shows a per-file diff against the current files.
- **Restore** replaces the current files with the snapshot's. Restoring is itself recorded, and the state before the restore is kept as a new snapshot, so nothing is lost.

Snapshots are the mechanism behind "review and revert" for AI runs; see [AI agent](/docs/ai-agent#review-and-revert).

## Activity history

The Activity tab lists notable events with actor and time: file saves, renames, deletions, snapshots and restores, AI runs, runtime starts, deployments and settings changes. It is read-only.

## Share links

Editors and above can create a share link with `view` or `edit` access and an optional expiry in days. Anyone with the link can open the project at that level without being a workspace member. Revoke a link from the Share panel; revoked links stop working immediately.

> Warning: An `edit` share link lets anyone holding it change files and run the agent against your quota. Prefer `view` links and short expiries.

## Project settings

- **Name and description** – shown in the dashboard and in the agent's context.
- **Visibility** – private by default. Public projects can appear in the [showcase](/showcase) when you opt in.
- **Environment variables** – see [Environment variables](/docs/environment-variables).
- **Duplicate** – copies files and environment variable *names* (not values) into a new project in the same workspace.
- **Delete** – a soft delete by an owner or admin. Deleted projects are not shown and their storage is released after the retention window described in [data retention](/data-retention).

## Concurrent editing

Codexa shows presence (who has which file open) in real time. Two people editing the same file at the same time are *not* merged: the last save wins. Conflict-free collaborative editing is on the roadmap.
