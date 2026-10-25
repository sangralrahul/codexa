---
title: Environment variables
description: Managing secrets for previews, builds and deployments; how values are encrypted, masked and injected.
category: Build
order: 16
tags: [environment, secrets, configuration]
author: Codexa Team
date: 2026-10-24
related: [security, deployment, databases]
---

Project environment variables hold configuration and secrets your code reads with `process.env.NAME` (or `import.meta.env.VITE_NAME` in Vite apps).

## Managing variables

Open the project's **Settings → Environment variables**.

- Add a variable with a name (`[A-Z_][A-Z0-9_]*`) and a value.
- Values are **encrypted at rest** with the platform encryption key. The list shows masked values; editors and above can reveal a value explicitly, and the reveal is recorded in activity.
- Viewers never see values, masked or not.
- Deleting a variable removes it from the next runtime start and build.

## Where values are injected

| Surface                 | Injected? | Notes                                                   |
| ----------------------- | --------- | ------------------------------------------------------- |
| Preview runtime         | Yes       | Set when the sandbox starts; restart after changes.     |
| Builds for deployment   | Yes       | Available to the build command.                         |
| Codexa static hosting   | No        | Static output has no server; only build-time values exist. |
| Vercel deployments      | Yes       | Sent through the Vercel API with the deployment.        |
| The AI agent            | Names only| The agent sees variable names in context, never values. |

## Vite apps

Vite only exposes variables prefixed with `VITE_` to browser code, and anything exposed that way ends up in the public bundle. Keep real secrets in a server project.

## Node + Express apps

All variables are available as `process.env.*`. Read them once at startup and fail fast when a required one is missing:

```ts
const required = ["DATABASE_URL", "SESSION_SECRET"] as const;
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing environment variable ${name}`);
}
```

## Duplicating projects

Duplicating a project copies variable **names** with empty values, so you remember what to set without leaking secrets between projects.

## Operator configuration

Platform-level settings (AI keys, OAuth apps, payment and email providers, the runner) are environment variables on the Codexa server itself, not project variables. The product shows explicit "not configured" states when they are absent.
