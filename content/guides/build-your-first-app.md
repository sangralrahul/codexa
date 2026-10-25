---
title: Build your first app
description: A complete beginner walkthrough - create a React project from a template, shape it with the agent, run the preview and deploy it.
category: Getting started
order: 1
tags: [beginner, react, templates, deployment]
author: Codexa Team
date: 2026-10-24
difficulty: beginner
duration: 30 min
related: [deploy-your-first-app, build-a-saas]
---

By the end of this guide you will have a small task-tracking app built on the React + Vite + TypeScript + Tailwind template, running in a preview and deployed to Codexa hosting. No prior experience with Codexa is assumed; some familiarity with web apps helps.

## What you need

- A verified Codexa account (the Free plan is enough).
- A workspace where AI is configured. If the agent panel says **AI is not configured**, you can still follow every step except the prompts by editing files yourself.

## Step 1: Create the project

1. Go to [/new-project](/new-project).
2. Filter templates by framework **Vite + React** and pick a minimal starter.
3. Name it `task-tracker` and create it.

Open `src/App.tsx` in the editor to see the starting point. It is ordinary code; nothing is hidden.

## Step 2: Describe the first feature

Open the agent panel in **Build** mode and send:

```text
Turn this into a task tracker:
- a text input and "Add" button at the top
- a list of tasks with a checkbox to complete and a delete button
- tasks persist in localStorage
- keep the Tailwind styling consistent with the current page
Done when `npm run build` passes.
```

Watch the stages: context loading, a short plan, file edits streamed one by one, then **validating** where the agent runs the build in the sandbox. If the build fails, you will see a **repairing** stage; the agent gets two attempts.

## Step 3: Review the diff

Open the History panel. The run created a snapshot named `Before AI run …`. Click the run to see a per-file diff. If something looks wrong, **Revert** restores the snapshot; otherwise continue.

## Step 4: Run the preview

Press **Run**. The sandbox installs dependencies and starts the Vite dev server; the preview appears when the port is ready. Add a task, reload the preview, and confirm it persists.

Use the viewport buttons to check the layout at phone width.

## Step 5: Iterate

Send a second, smaller request:

```text
Add a filter row with "All / Active / Completed" buttons above the list.
Keep the selected filter in the URL hash so reloading keeps it.
```

Small, separate runs are easier to review and cheaper in tokens than one large prompt. See [Prompting](/docs/prompting).

## Step 6: Make a change by hand

Open `src/App.tsx`, change the page title text, and press `Ctrl/Cmd+S`. The running preview picks up the change; the agent will see it on its next run.

## Step 7: Deploy

1. Open the Deploy panel and choose **Codexa hosting**.
2. Wait for the build log to finish; the deployment turns **live** with a URL.
3. Make one more change and deploy again. The first deployment stays in history; **Rollback** switches back to it instantly.

## Where to go next

- [Build a SaaS](/guides/build-a-saas) adds an API, authentication and billing.
- [Connect a database](/guides/connect-a-database) when localStorage is no longer enough.
- [Deploy your first app](/guides/deploy-your-first-app) covers custom domains and Vercel.
