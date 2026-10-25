---
title: Previews
description: Starting and stopping previews, reading logs, runtime limits and what to do when a preview will not start.
category: Building
order: 4
tags: [preview, runtime, logs]
author: Codexa Team
date: 2026-10-24
related: [projects, ai-limits]
---

## What a preview is

**Run** starts your project in an isolated sandbox and exposes it at a preview URL. Dependencies are installed, the template's dev command runs, and output streams into the Logs panel.

## It will not start

1. Read the Logs panel; the real error is there.
2. **Runner unavailable** means the execution service is down. Editing and snapshots still work; try again later or check [status](/status).
3. `quota_exceeded` with `runtime_minutes` means the month's runtime allowance is used (5 hours on Free).
4. A dependency error: run **install** from the Logs panel.

## Runtime minutes

Minutes are counted while a sandbox is running, whether or not you are looking at it. Previews stop automatically after a period of inactivity and when you press **Stop**. The Usage page shows the running total.

## Changes do not show up

Saved files are synced into the running sandbox. If the dev server needs a restart (for example after changing environment variables), press **Restart**.

## Sharing a preview URL

Preview URLs are tied to the sandbox and your session; they are not public hosting. To share something durable, [deploy](/help/deployments) it.
