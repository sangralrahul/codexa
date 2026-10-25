---
title: AI limits
description: What counts as an AI request, token limits, why a run stopped, and what "AI is not configured" means.
category: Building
order: 6
tags: [ai, quota, limits]
author: Codexa Team
date: 2026-10-24
related: [billing, projects]
---

## What counts as a request

Each run you start in the agent panel is one AI request, in any mode. Tokens sent to and received from the provider are counted separately. Free: 50 requests and 500k tokens per month; Pro: 1,000 and 10M; Team: 5,000 and 50M. Counters reset monthly.

## The run was refused with quota_exceeded

The monthly request or token allowance is used. Wait for the reset, or upgrade from Workspace → Billing. The error says which limit (`ai_request` or `ai_tokens`).

## The run stopped early

Runs are bounded: 40 tool calls, 60 model turns, 25 minutes, 2 repair attempts. The final message says which bound was hit. Split the task into smaller requests; see [prompting](/docs/prompting).

## "AI is not configured"

The deployment has no Anthropic or OpenAI key on the server. The operator must configure one; nothing in your account changes this. Templates, editor, previews and deployments work without AI.

## Which model is used?

The agent panel shows the active provider and model. The operator chooses the default; per-workspace selection is not available yet.

## Is my code sent to the provider?

Yes, the relevant files and your messages are sent to the configured provider for each run. Environment variable values are never sent. See the [AI policy](/ai-policy).
