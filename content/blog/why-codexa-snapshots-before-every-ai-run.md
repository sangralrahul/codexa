---
title: Why Codexa snapshots before every AI run
description: An AI that edits real files needs an undo button that always works. Here is how snapshots make every agent run reviewable and reversible.
category: Engineering
tags: [ai, snapshots, design]
author: Codexa Team
date: 2026-10-24
related: [how-the-sandbox-isolates-your-project]
---

An agent that can write files is only useful if you can trust it to be wrong sometimes. We spent more time on the undo path than on the generation path, and this post explains why and how.

## The problem with "apply this diff"

Many tools show a proposed change and ask you to accept it. That works for one file. It stops working when a change touches eight files, adds a dependency and rewrites a config, because the question "do I accept this?" is really "do I understand all of this?", and the honest answer is often no.

We wanted a different question: **can I get back to where I was, exactly, in one click?** If the answer is always yes, you can let the agent work, look at the result, and decide afterwards.

## What a snapshot is

A snapshot in Codexa is a named checkpoint of every file in the project, stored in the same database as the files. Snapshots are cheap: files are content-addressed, so a snapshot of a project where one file changed stores one new blob and a list of references.

The agent takes one automatically, named `Before AI run <id>`, at the moment it is about to make its first write. Not when the run starts (a run that only reads should not litter your history) and not at the end (too late to be useful if the run is cancelled).

## What you get from it

- **A real diff.** Opening a run shows each changed file against the snapshot, not against a guess about what the agent "meant" to change.
- **Revert in one click.** Restoring the snapshot replaces the current files. The state before the restore is saved as a new snapshot, so even the revert is reversible.
- **Cancel without fear.** If you cancel a run mid-way, files already written stay, but the snapshot is there. Partial runs are not scary.

## The limits that make it work

Snapshots are necessary but not sufficient. The agent is also bounded: at most 40 tool calls, 60 model turns, 25 minutes and two repair attempts per run. A bounded run produces a bounded diff, which is the kind a person can actually review. An unbounded agent produces changes nobody reads.

## What we did not build

We did not build "accept hunk by hunk". If you want part of a run, edit by hand or ask for a follow-up; both take a few seconds and keep the model simple. We also did not build automatic acceptance based on tests passing. Passing tests are evidence, not consent.

## Trying it

Open any project, ask for something you are not sure about, and look for the snapshot in the History panel. The [tutorial](/tutorials/review-and-revert-an-ai-run) walks through review and revert.
