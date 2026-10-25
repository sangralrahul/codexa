---
title: Projects
description: Creating, duplicating, sharing, restoring and deleting projects; project limits.
category: Building
order: 3
tags: [projects, snapshots, sharing]
author: Codexa Team
date: 2026-10-24
related: [previews, deployments]
---

## How many projects can I have?

Free: 3, Pro: 25, Team: 100 active projects per workspace. Deleted projects do not count. Over the limit, creating a project returns `quota_exceeded`.

## Which templates exist?

React + Vite + TypeScript + Tailwind apps, static HTML/CSS/JS sites and Node + Express APIs. A Next.js template is on the roadmap. Browse [/templates](/templates).

## I lost changes

Open the History panel. Every agent run and every manual snapshot is a full checkpoint; restoring one brings files back. Restores are themselves snapshotted, so you can undo an undo.

## Sharing a project

Share panel → create a link with `view` or `edit` access and an optional expiry. Revoke links from the same panel. Workspace members do not need links.

## Duplicating

Project menu → **Duplicate** copies the files into a new project in the same workspace. Environment variable names are copied; values are not.

## Deleting and recovering

Deleting is a soft delete by an owner or admin. [Contact support](/help/contacting-support) within the retention window described in [data retention](/data-retention) to recover one.

## Two people edited the same file

Last save wins. Codexa shows who is viewing each file, but concurrent editing with merging is not available yet. Use snapshots to recover an overwritten version.
