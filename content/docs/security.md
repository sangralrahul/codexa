---
title: Security
description: How Codexa isolates project runtimes, protects secrets and sessions, authorizes every request, and what it does not claim.
category: Account
order: 31
tags: [security, sandbox, encryption, isolation]
author: Codexa Team
date: 2026-10-24
updated: 2026-10-27
related: [authentication, environment-variables, ai-agent]
---

This page describes the security model as implemented. For the public commitments and how to report an issue, see [/security](/security) and [responsible disclosure](/responsible-disclosure).

## Runtime isolation

Generated and user code never runs inside the web application. The **runner service** executes it in a sandbox.

On Codexa's hosted service, each project runs in **its own Cloudflare Container**, a separate lightweight virtual machine owned by a Durable Object for that project:

- one project per container, so the container is the isolation boundary between projects,
- commands run as an unprivileged user inside it, with wall-clock timeouts,
- the container's instance type caps CPU, memory and disk,
- it starts on demand and stops after 30 minutes without requests,
- it has outbound internet access so dependency installs work.

In every setup:

- allow-listed commands only (`install`, `build`, `test`, `typecheck`, the template's dev command); the agent cannot run arbitrary shell,
- previews are reached through a host-based proxy that maps one preview address to one project's sandbox; sandboxes cannot see each other.

Operators who run the runner themselves get a different default driver: an unprivileged user inside Linux user, PID, mount and network namespaces, with cgroup limits on memory and process count. Optional Docker and E2B drivers are available for container or remote isolation.

## Secrets

- Environment variable values, integration credentials and GitHub tokens are encrypted with the platform encryption key before they are stored.
- The API returns masked values; revealing a value requires the editor role and is logged.
- Secrets are never included in logs, AI context or tool outputs.
- Password hashes, session tokens and email tokens are stored hashed.

## Sessions and authorization

- Sessions are httpOnly cookies backed by hashed tokens with expiry.
- Every API route authenticates the user and checks workspace role or project access on the server; client-supplied ids are never trusted.
- Admin pages require a staff account.
- Auth and AI endpoints are rate limited.

## AI boundaries

- The agent only sees file contents, the file tree, recent messages and sanitized tool output; never environment variable values.
- Paths are validated so tools cannot escape the project.
- Runs are bounded in tool calls, turns, time and tokens, and start with a snapshot so changes are reversible.
- Prompts and file contents are sent to the configured provider (Anthropic or OpenAI). The [AI policy](/ai-policy) describes this in user-facing terms.

## Webhooks

Stripe and Razorpay webhooks are verified by signature and deduplicated by event id. See [Webhooks](/api/webhooks).

## What we do not claim

Codexa has **no third-party certifications or audits** (no SOC 2, ISO 27001, HIPAA or similar) at this stage. Statements about compliance programmes will only appear here when they are true.

> Review: Public security and compliance statements beyond this engineering description require legal and security review before publication.

## Reporting a vulnerability

Email [security@codexa.app](mailto:security@codexa.app) or use the [vulnerability reporting](/vulnerability-reporting) form.
