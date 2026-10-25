---
title: Databases
description: Connecting PostgreSQL and Supabase to a project, browsing the schema, running SQL safely, and using the connection from generated code.
category: Build
order: 13
tags: [database, postgresql, supabase, sql]
author: Codexa Team
date: 2026-10-24
related: [environment-variables, integrations, authentication]
---

Codexa does not host databases. You connect an existing **PostgreSQL** server or a **Supabase** project, and Codexa gives you a schema browser and a SQL runner inside the project, plus the connection string as an environment variable for your code.

## Add a connection

1. Open the project's **Database** panel and choose **Add connection**.
2. Pick PostgreSQL or Supabase. For Supabase, use the connection string from the project's database settings (the pooled "transaction" URL works for serverless-style apps).
3. Paste the connection string. It is encrypted before storage and never returned to the browser again.
4. **Test** performs a `SELECT 1` and reports success or the driver's error message.

Connections are workspace resources; admins manage them under Integrations and any project in the workspace can use them.

## Schema browser

The panel lists schemas, tables, columns with types and nullability, primary keys and indexes, read live from `information_schema`. It is read-only.

## SQL runner

Type a statement and run it. Results show rows, fields and the row count, capped at 500 rows per query.

> Warning: Statements that modify or destroy data (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `ALTER`) require a confirmation step. The first request returns `confirmation_required`; the panel shows the statement again and asks you to confirm before it is re-sent with the confirmation flag.

The runner uses the credentials of the connection, so whatever that role can do, the runner can do. Use a least-privilege role for day-to-day work.

## Using the database from your code

Codexa injects nothing automatically. Add an environment variable (for example `DATABASE_URL`) in the project's [environment variables](/docs/environment-variables) and read it from your code. For a Node + Express template:

```ts
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

app.get("/api/orders", async (_req, res) => {
  const { rows } = await pool.query("select id, total from orders order by id desc limit 50");
  res.json(rows);
});
```

For a Vite + React single-page app there is no server, so the browser must not hold database credentials. Either add a Node + Express project as the API, or use Supabase's row-level security with the public anon key.

## Migrations

Codexa does not run migrations for you. Keep migration files in the project (the Node template ships with a `migrations/` folder and an npm script) and run them with **Run command → build/test** or from your own machine.

## Asking the agent

The agent can read your connection *names* and the schema browser output you paste, but it has no tool to query the database. Paste the relevant `CREATE TABLE` statements into the prompt when you ask for code that touches them.
