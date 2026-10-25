---
title: Prompting patterns that produce maintainable code
description: Five habits that turn a code-writing agent from a slot machine into a colleague, learned from building and using Codexa's own agent.
category: Practice
tags: [prompting, ai, best-practices]
author: Codexa Team
date: 2026-10-24
related: [why-codexa-snapshots-before-every-ai-run]
---

The Codexa agent has a small set of tools, a bounded loop and a validation step. Within those bounds the biggest variable is the prompt. These are the patterns that consistently gave us code we were happy to keep.

## 1. Describe behaviour, let the agent choose structure

"Add a modal that opens from the header button, traps focus and closes on Escape" produces better code than "add a useState and a div". The model knows how to build a modal; it does not know what you want the modal to do.

## 2. One concern per run

The repair loop is capped at two attempts, and a run that tries to do three things usually fails on the third. Three runs of one thing each are cheaper, faster to review and easier to revert individually.

## 3. Say the constraints you care about

- "No new dependencies."
- "Reuse the components in `src/components/ui`."
- "Keep strings in the i18n file."

These sentences are cheap and prevent the most common complaint about generated code: it is fine, but it does not look like the rest of the project.

## 4. Write acceptance criteria

A "done when" list becomes something the agent checks before it calls `finish`, and something you check in the diff. If you cannot write the criteria, the request is not ready.

## 5. Use Ask mode before Build mode on unfamiliar code

Read-only tools, no writes. "How is validation done here and where would a phone field go?" costs little and makes the Build prompt precise.

## Two anti-patterns

- **Restating the project.** The agent already reads your files. Long prompts that describe the codebase waste the 8,000-character budget and add nothing.
- **Asking for virtues.** "Make it clean and follow best practices" is not actionable. Name the practice.

## Why this matters more with an agent than with autocomplete

Autocomplete suggests a line you were about to write. An agent writes files you have not seen. The prompt is the only place your intent lives, so it has to carry the constraints you would otherwise enforce while typing. The [prompting guide](/docs/prompting) has more examples.
