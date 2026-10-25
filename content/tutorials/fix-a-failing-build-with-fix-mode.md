---
title: Fix a failing build with Fix mode
description: Introduce a type error on purpose, watch the sandbox catch it, and let the agent repair it within its two-attempt limit.
category: Agent
order: 1
tags: [ai, fix-mode, typescript, repair]
author: Codexa Team
date: 2026-10-24
difficulty: beginner
duration: 15 min
related: [review-and-revert-an-ai-run, add-dark-mode-to-a-vite-app]
---

The agent's repair loop is easiest to understand when you break something yourself first.

## 1. Break the build

Open any Vite + React project. In `src/App.tsx` add:

```ts
const count: number = "three";
```

Save with `Ctrl/Cmd+S`. Monaco underlines the line immediately, but the authoritative check is the sandbox.

## 2. Run the real type-check

Logs panel → **Run command → typecheck**. The output is the real `tsc` result:

```text
src/App.tsx(4,7): error TS2322: Type 'string' is not assignable to type 'number'.
```

## 3. Hand it to Fix mode

Switch the agent to **Fix** and paste the error verbatim. Fix mode uses the same tools as Build with a repair-oriented prompt. Watch the stages:

- `loading_context` reads `src/App.tsx` because the error names it.
- `planning` proposes a one-line change.
- `working` edits the file (a snapshot is created first).
- `validating` runs `typecheck` again and gets a clean result.

## 4. See the bound

If a fix introduces a new error, the agent enters `repairing` and tries again, at most twice. After that the run ends as `failed` with the last error shown, and the snapshot lets you revert. This is deliberate: an unbounded loop would burn your quota on a problem that needs a human.

## 5. Review

Open the run in History and inspect the diff. It should touch one line. If the agent did more than you asked, that is a sign the prompt was too open; see [Prompting](/docs/prompting).
