---
title: Connect a database
description: Add a PostgreSQL or Supabase connection, browse the schema, run SQL safely and use the database from a Node + Express project.
category: Data
order: 4
tags: [database, postgresql, supabase]
author: Codexa Team
date: 2026-10-24
difficulty: beginner
duration: 20 min
related: [build-a-saas, build-an-ecommerce-store]
---

Codexa connects to databases you already have; it does not provision them. You need a PostgreSQL connection string (from your own server, a managed provider, or Supabase).

## Step 1: Add the connection

1. Workspace → **Integrations** → **PostgreSQL** (or **Supabase**).
2. Name it, paste the connection string, and press **Test**. The test runs `SELECT 1` and shows the real driver error when it fails (wrong password, unreachable host, SSL required).
3. Save. The string is encrypted at rest and will not be shown again.

> Tip: For Supabase, copy the **transaction pooler** URL from the project's database settings and append `?sslmode=require` if your driver needs it.

## Step 2: Browse the schema

Open any project's **Database** panel and select the connection. Tables, columns, types, keys and indexes are read live. Nothing is cached, so changes made elsewhere show up immediately.

## Step 3: Run SQL

Use the SQL runner for exploration:

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;
```

Destructive statements ask for confirmation on the first attempt (`confirmation_required`). That is intentional; read [Databases](/docs/databases#sql-runner).

## Step 4: Use it from code

In a Node + Express project, add `DATABASE_URL` under **Settings → Environment variables**, restart the preview, and ask the agent:

```text
Add a pg Pool created from process.env.DATABASE_URL and a GET /api/health
route that runs `select now()` and returns the timestamp.
```

Open `/api/health` in the preview to confirm the round trip.

## Step 5: Migrations

Create a `migrations/` folder with numbered SQL files and an npm script that applies them in order. Run it from **Run command** or your own machine. Codexa does not run migrations automatically; that keeps surprises out of production.

## Browser apps

A Vite + React app must not hold a database password. Put the queries behind an Express project, or use Supabase row-level security with the anon key.
