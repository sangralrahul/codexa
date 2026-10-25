---
title: Review and revert an AI run
description: Use the automatic snapshot taken before every run to inspect a diff, keep part of it, and revert the rest.
category: Agent
order: 2
tags: [snapshots, diff, revert, ai]
author: Codexa Team
date: 2026-10-24
difficulty: beginner
duration: 10 min
related: [fix-a-failing-build-with-fix-mode]
---

Every agent run begins with a snapshot named `Before AI run <id>`. This tutorial uses it.

## 1. Make a change you might not want

In Build mode:

```text
Restyle the header: dark background, centered logo, uppercase navigation.
```

Let the run finish.

## 2. Open the diff

History panel → the run → **Review**. The left side is the snapshot; the right side is the current file. Only files the run changed are listed.

## 3. Keep some of it

Suppose you like the dark background but not the uppercase navigation. You have two options:

- **Edit by hand**: change the class in the editor and save. Fast for small adjustments.
- **Ask for a follow-up**: "Keep the dark header but restore the original navigation casing." A new run, a new snapshot.

## 4. Revert everything

If none of it is wanted, press **Revert** on the run. The snapshot's files replace the current ones. Note two things:

- Changes you made by hand *after* the run are also replaced, because a snapshot is a full checkpoint. Review first.
- The state before the revert is itself saved as a snapshot, so a revert is reversible too.

## 5. Name your own checkpoints

Before a large request, create a snapshot manually with a meaningful name ("before pricing page"). Automatic snapshots are per run; yours can span several.
