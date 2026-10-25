---
title: AI app development
description: Build applications that call AI providers safely - server-side keys, streaming, limits and testing without real keys.
category: Projects
order: 6
tags: [ai, openai, anthropic, streaming, security]
author: Codexa Team
date: 2026-10-24
difficulty: intermediate
duration: 60 min
related: [build-a-saas, connect-a-database]
---

Apps that call a model have one hard rule: the provider key stays on a server. This guide builds a small chat app as a Vite + React frontend plus a Node + Express API, the same split Codexa uses internally.

## Step 1: Store the credential

Add an OpenAI or Anthropic connection under workspace Integrations so it is tested, then add the key to the API project as `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. Never add it to the frontend project; `VITE_*` variables end up in the public bundle.

## Step 2: The API

Create a **Node + Express** project and ask the agent:

```text
Add POST /chat that takes { messages: [{ role, content }] }, calls the
provider using the official SDK already in package.json (openai or
@anthropic-ai/sdk) and streams the reply as server-sent events:
  event: text   data: {"delta": "..."}
  event: done   data: {"inputTokens": n, "outputTokens": n}
  event: error  data: {"message": "..."}
Limit messages to 20 and each content to 4,000 characters; return 400 otherwise.
Add a per-IP rate limit of 30 requests per 15 minutes.
```

If the SDK is not in `package.json`, say "add the openai package" explicitly; the sandbox installs from the registry.

## Step 3: The frontend

```text
Add a chat UI that posts to import.meta.env.VITE_API_URL + "/chat" and
renders streamed text as it arrives (parse SSE from fetch's body stream).
Show a "not configured" message when the API returns 503.
```

## Step 4: Fail honestly when there is no key

Have the API return `503 { error: { code: "ai_not_configured" } }` when the key is missing, and have the UI show that state. Mock output for a demo is tempting and misleading; Codexa itself refuses to pretend the agent works without a key.

## Step 5: Testing without real calls

Ask the agent for a provider interface with a `MockProvider` used when `AI_MOCK=1`, so `npm test` runs in the sandbox without network access or keys. Keep the mock's output clearly labelled.

## Step 6: Cost and abuse controls

- Count tokens from the provider's usage fields and store them per user.
- Cap tokens per day per user in the API, returning 402 with a clear code.
- Keep the system prompt on the server; clients send only user messages.

## Deploy

Frontend to Codexa hosting; API to a Node host via GitHub push. Set the key only in the production API environment.
