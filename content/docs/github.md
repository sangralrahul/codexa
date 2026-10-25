---
title: GitHub
description: Connecting GitHub, importing a repository into a project, and committing and pushing project files back.
category: Ship
order: 22
tags: [github, git, import, push]
author: Codexa Team
date: 2026-10-24
related: [projects, integrations]
---

GitHub integration has three parts: sign-in (optional), import and push. All of them need the operator to configure a GitHub OAuth app; when it is missing, the GitHub panel shows a **not configured** state.

## Connect your account

1. Open [/connect-github](/connect-github) or the project's GitHub panel.
2. Authorize the Codexa OAuth app. Codexa requests repository scope so it can read and push; the token is encrypted at rest.
3. The connection is tied to your workspace and can be removed from Integrations.

## Import a repository

1. [/import-project](/import-project) → choose a repository and a branch.
2. Codexa downloads a tarball of that branch and stores the files in a new project. Git history is **not** imported; the project starts from a clean snapshot of the branch.
3. Files above the per-project storage limit are rejected with a clear message before anything is written.

Imported projects behave like template projects. The template family is detected from the files (`vite.config.*`, `package.json` scripts, or plain HTML) and determines the dev and build commands.

## Commit and push

From the GitHub panel:

1. Enter a commit message and (optionally) a branch name; the default is the branch you imported from.
2. Codexa creates a commit containing the current project files on top of the branch head and pushes it through the GitHub API.
3. The panel shows the commit link or GitHub's error message.

Push replaces the tracked files with the project's current files. It does not merge, so if the branch moved on GitHub since the import, push to a new branch and open a pull request there.

## Status

`GET /github/status` (and the panel) report whether the project is linked, the repository, the branch, and when it was last pushed.

## What is not supported yet

- Pulling updates from GitHub into an existing project (re-import creates a new project).
- Two-way sync or webhooks from GitHub.
- GitHub sign-in without the OAuth app configured.
