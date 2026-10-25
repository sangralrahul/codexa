---
title: GitHub
description: Connecting GitHub, importing repositories, pushing changes and common errors.
category: Shipping
order: 7
tags: [github, import, push]
author: Codexa Team
date: 2026-10-24
related: [projects, deployments]
---

## "GitHub is not configured"

The operator has not set up a GitHub OAuth app on this deployment. Import and push are unavailable until they do; everything else works.

## Importing a repository

[/import-project](/import-project) → pick a repository and branch. Files are copied into a new project; git history is not. Repositories larger than your plan's storage limit are refused before anything is written.

## Pushing changes

GitHub panel → commit message → **Push**. Codexa creates a commit with the project's current files on the chosen branch. If the branch changed on GitHub since you imported, push to a new branch and open a pull request.

## Push failed with a permission error

Reconnect GitHub from Integrations; the token may have been revoked, or the repository belongs to an organisation that has not approved the app.

## Pulling updates from GitHub

Not supported yet. Import again into a new project, or copy the changed files in the editor.
