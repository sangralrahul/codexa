---
title: Runtime and previews
description: The runner service with allow-listed commands, sandboxed execution, a host-based preview proxy and streamed logs. Since 0.2.0 the hosted service runs each project in its own Cloudflare Container.
category: Release
order: 4
version: 0.1.0
tags: [release, runtime, sandbox, preview]
author: Codexa Team
date: 2026-10-24
related: [ai-agent, deployments]
---

## Runner service

- A separate service (not the Next.js process) that materialises project files and runs commands.
- Default driver: unprivileged user, Linux user/PID/mount/network namespaces, cgroup memory and process limits, per-command timeouts.
- Optional Docker and E2B drivers selected by operator configuration.
- Since [0.2.0](/changelog/cloudflare-platform), Codexa's hosted service runs the runner inside one Cloudflare Container per project; the container is the isolation boundary and commands run as an unprivileged user. The drivers above remain for self-hosted runners.
- Allow-listed commands only: `install`, `build`, `test`, `typecheck` and the template's dev command.

## Previews

- Start/stop a runtime per project; `GET /runtime` reports the session and whether the runner is reachable.
- Host-based proxy mapping one hostname to one sandbox.
- Logs streamed over SSE (`stdout`, `stderr`, `system`) into the Logs panel.
- File sync from the editor into the running sandbox.
- Viewport controls for phone, tablet and desktop widths.
- Runtime minutes metered against the plan.

Documentation: [Troubleshooting](/docs/troubleshooting), [Security](/docs/security).
