---
title: Getting started
description: Create a Codexa account, set up your workspace and understand the pieces you will use every day.
category: Start here
order: 1
tags: [account, workspace, basics]
author: Codexa Team
date: 2026-10-24
related: [quickstart, projects, prompting]
---

Codexa turns a written description into a working project, then gives you a real editor, an isolated runtime with a live preview, and a deployment pipeline for the result. This page covers the account and workspace basics; the [quickstart](/docs/quickstart) takes you from a prompt to a running preview.

## Create an account

1. Open [/signup](/signup) and register with an email address and a password (at least 8 characters).
2. Check your inbox for the verification email and open the link. Until the address is verified, actions that send email or create deployments are limited.
3. If the operator has configured GitHub sign-in, a **Continue with GitHub** button appears on the sign-in page. It links a GitHub identity to the same kind of account; nothing about your repositories is read until you explicitly import one.

> Note: Verification emails are sent through a transactional email provider that the operator configures. If the deployment you are using has no email provider, the sign-up page says so and the operator can verify accounts manually.

## Workspaces

Every account gets a **personal workspace**. Projects, usage counters, billing and integrations are attached to a workspace, not to a user.

Team plans add **team workspaces** with four roles:

| Role   | Can do                                                                          |
| ------ | ------------------------------------------------------------------------------- |
| Viewer | Open projects, read files, watch previews and logs.                             |
| Editor | Everything a viewer can, plus edit files, run the agent, start runtimes, deploy. |
| Admin  | Everything an editor can, plus invite and remove members, manage integrations.  |
| Owner  | Everything an admin can, plus billing and deleting the workspace.               |

Invitations are sent by email and expire; the invitee must sign in (or sign up) with the invited address.

## What is in a project

A project is a set of files stored in Codexa's database plus everything that happens to them:

- **Files** – ordinary source files. You can download them, push them to GitHub or copy them elsewhere at any time.
- **Snapshots** – named checkpoints with per-file diffs. The agent takes one automatically before every run.
- **Activity** – a log of saves, snapshots, runs and deployments with who did what.
- **Environment variables** – encrypted at rest, injected into previews and builds, never shown to viewers.
- **Deployments** – build history with rollback.

See [Projects](/docs/projects) for the details.

## The three surfaces

- **Editor** – a Monaco-based editor with tabs, file explorer, search and replace, diagnostics and diff view. [Editor docs](/docs/editor).
- **Agent panel** – the chat where you describe changes. The agent plans, edits real files and validates in the sandbox. [AI agent docs](/docs/ai-agent).
- **Preview** – your project running in an isolated sandbox, proxied to a preview URL with streamed logs. [Deployment docs](/docs/deployment) explain how a preview becomes a public site.

## Next steps

- Follow the [quickstart](/docs/quickstart).
- Read the [prompting guide](/docs/prompting) before your first large request; it saves tokens and rework.
- Check [billing](/docs/billing) to understand the Free plan limits.
