---
title: Prompting
description: Practical prompt patterns that produce maintainable code from the Codexa agent, with examples.
category: Start here
order: 3
tags: [prompting, ai, best-practices]
author: Codexa Team
date: 2026-10-24
related: [ai-agent, quickstart, troubleshooting]
---

The agent edits real files with real tools. The quality of what it writes depends far more on *what you ask for* than on the model. These patterns come from the way the agent is built: it loads limited context, works in bounded steps and validates with a type-check and build.

## State the outcome, not the keystrokes

Describe the behaviour the user should see. Let the agent pick file names and implementation unless you care.

```text
Bad:  Open App.tsx and add a useState for the modal and a button that sets it.
Good: Add a "Contact us" modal that opens from the header button, traps
      focus, closes on Escape, and submits name/email/message to
      POST /api/contact.
```

## One change per run

Runs are bounded (at most 40 tool calls and 2 repair attempts). A prompt that asks for a dashboard, authentication *and* a billing page usually ends with a half-finished third item. Split it:

1. "Add the dashboard layout with a sidebar and three placeholder panels."
2. "Fill the first panel with a table of recent orders loaded from `/api/orders`."
3. "Add client-side filtering by status to that table."

Each run gets its own snapshot and diff, so reviewing is easier too.

## Name the constraints that matter

The agent reads your files, but it does not know your intentions. Say them:

```text
Add a settings page. Constraints:
- reuse the existing <Card> and <Button> components in src/components/ui
- keep all strings in src/i18n/en.ts
- no new dependencies
```

"No new dependencies" is worth saying explicitly on small projects; the sandbox will install anything in `package.json`, but you may not want it.

## Paste the error, not a description of it

In **Fix** mode, paste the exact output from the Logs panel or the build. The agent runs the same commands in the sandbox and compares.

```text
Fix this build error:

src/pages/Orders.tsx(42,18): error TS2339: Property 'total' does not exist
on type 'Order'.
```

## Use Ask mode to understand before changing

**Ask** mode gives the agent read-only tools. Use it to get an explanation of a file or an approach, then switch to **Build** with a precise request.

```text
Ask: How is form validation done in this project, and where would a new
"phone" field be validated?
```

## Give acceptance criteria for anything non-trivial

A checklist turns into tests the agent can run, or at least into things it checks before calling `finish`.

```text
Add CSV export to the orders table.
Done when:
- a "Download CSV" button appears next to the filters
- the file includes the currently filtered rows only
- dates are ISO 8601
- `npm run build` passes
```

## When to write code yourself

The editor is always there. Small renames, copy changes and one-line fixes are faster by hand and cost nothing from your AI quota. Save, and the agent will see the new content on its next run.

## What does not help

- Asking for "best practices" or "clean code" without saying which practices.
- Very long prompts that restate the whole project. The agent already reads your files; the prompt limit is 8,000 characters for a reason.
- Asking the agent to deploy, change billing or manage members. Those are product actions outside its tools; use the panels.
