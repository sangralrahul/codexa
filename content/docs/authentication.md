---
title: Authentication
description: Adding authentication to generated applications, and how Codexa's own accounts, sessions and verification work.
category: Build
order: 14
tags: [authentication, sessions, security]
author: Codexa Team
date: 2026-10-24
related: [security, databases, environment-variables]
---

This page covers two different things: how to add sign-in to an app you build with Codexa, and how Codexa authenticates *you*.

## Adding auth to a generated app

Codexa's templates do not ship with authentication; you add it with the agent or by hand. The approach depends on the template:

### Node + Express API

Session or token based auth lives in the API. A realistic prompt:

```text
Add email/password authentication:
- POST /auth/signup and /auth/login with bcrypt-hashed passwords stored in
  the users table (see schema below)
- httpOnly session cookie, 7-day expiry, sessions table
- a requireUser middleware used by every /api route
- no new dependencies other than bcrypt and cookie-parser
```

Store the session secret and database URL as [environment variables](/docs/environment-variables), never in code.

### Vite + React single-page app

A browser app has no secrets. Either:

- pair it with a Node + Express project that owns sessions and expose `/api/me`, or
- use a hosted auth provider (Supabase Auth is a common choice when you already connected Supabase) and keep only the public key in the client.

### Static sites

Static hosting serves files; there is no server to check a session. Put anything that needs auth behind an API project.

> Tip: Ask the agent in **Ask** mode to explain the trade-offs for your project before building. It reads your actual files.

## How Codexa authenticates you

- **Accounts** are email + password. Passwords are hashed with a modern password hash; plaintext is never stored or logged.
- **Sessions** are httpOnly, `SameSite=Lax` cookies. The token in the cookie is random and only its hash is stored, so a database leak does not yield usable sessions. Sessions expire and can be revoked from account settings.
- **Email verification** uses single-use, expiring tokens, also stored hashed. The same mechanism backs password reset; an invalid or expired link returns `invalid_token`.
- **GitHub sign-in** is available when the operator configures a GitHub OAuth app. It links a GitHub identity to an account; repository access is a separate, explicit step.
- **API access** uses the same session cookie. Personal API tokens are planned; see [API authentication](/api/authentication).
- **Rate limits** apply to sign-up, sign-in, password reset and AI endpoints (`rate_limited`, HTTP 429 with `Retry-After`).

Server code checks authorization on every request with workspace roles; nothing is trusted from the client. See [Security](/docs/security).
