# Deploying Codexa on Cloudflare

Codexa runs on **Cloudflare Workers** through the OpenNext adapter (`@opennextjs/cloudflare`). This
was tested in Cloudflare's local runtime (workerd): all 130 public pages, sign-up and sign-in, the
dashboard, projects, the code editor, snapshots, settings and admin work.

## What you need

- A Cloudflare account on the **Workers Paid** plan. The Codexa Worker is about 4.3 MB compressed;
  the free plan allows 3 MB.
- A **PostgreSQL** database. Cloudflare doesn't host Postgres, so use Neon, Supabase or any Postgres
  provider, and connect it through **Hyperdrive** (Cloudflare's database connection pooler).
- Node.js 22 and this repository on your computer.

## What works on Cloudflare

| Works | Not available (needs a separate Linux server) |
| --- | --- |
| Website, docs, templates, pricing | Live preview, Run, logs |
| Accounts, email (Customer.io), teams, settings, admin | Codexa hosting deploys |
| Projects, editor, version history, AI generation | Live presence (who's online) |

## Step by step

All commands run in the `codexa` folder on your computer.

### 1. Install and log in

```bash
npm install
npx wrangler login
```

### 2. Create the database

Create a Postgres database at Neon or Supabase and copy its connection string
(`postgres://user:password@host/db?sslmode=require`). Then create the tables once:

```bash
DATABASE_URL="<your connection string>" npm run db:migrate
```

On Windows Command Prompt:

```bat
set DATABASE_URL=<your connection string>
npm run db:migrate
```

### 3. Connect it through Hyperdrive

```bash
npx wrangler hyperdrive create codexa-db --connection-string="<your connection string>"
```

It prints an `id`. Open `wrangler.jsonc`, uncomment the `hyperdrive` block at the bottom and paste
that id.

### 4. Add your secrets

Each command asks you to paste the value.

```bash
npx wrangler secret put DATABASE_URL          # your connection string (used as a fallback)
npx wrangler secret put SESSION_SECRET        # a long random string
npx wrangler secret put ENCRYPTION_KEY        # a different long random string; never change it later
npx wrangler secret put ANTHROPIC_API_KEY     # your Anthropic key
npx wrangler secret put CUSTOMERIO_APP_API_KEY  # your Customer.io App API key
```

And these three settings. They aren't secret, but storing them the same way is simplest:

```bash
npx wrangler secret put EMAIL_FROM            # e.g. Codexa <no-reply@yourdomain.com> (a domain verified in Customer.io)
npx wrangler secret put CUSTOMERIO_REGION     # us or eu
npx wrangler secret put APP_URL               # your site address, e.g. https://codexa.yourdomain.com
```

`APP_URL` matters: email links and sign-in redirects use it. Set it to the address you will use
(your `*.workers.dev` address at first, your own domain later).

### 5. Deploy

```bash
npm run cf:deploy
```

It builds Codexa, uploads it, and prints your address (`https://codexa.<your-subdomain>.workers.dev`).
Open it, then open `/status`: Database should say **Operational**, AI and Email **configured**.

### 6. Use your own domain (optional)

In the Cloudflare dashboard: **Workers & Pages → codexa → Settings → Domains & Routes → Add →
Custom domain**. Then update the `APP_URL` secret to that address and run `npm run cf:deploy` again.

### 7. Make yourself admin

Sign up on the site, then from your computer:

```bash
DATABASE_URL="<your connection string>" npm run user:admin -- make-admin you@example.com
```

## Test it before deploying (optional)

`npm run cf:preview` builds Codexa and runs it in Cloudflare's runtime on your computer at
http://localhost:8787. It reads settings from `.dev.vars` (copy `.dev.vars.example`).

Then check it automatically:

```bash
E2E_NO_SERVER=1 E2E_BASE_URL=http://localhost:8787 E2E_DATABASE_URL="<db url>" \
  npx playwright test tests/e2e/serverless-smoke.spec.ts --project=desktop
```

## Notes

- AI runs stream for up to about 4.5 minutes per request. Set `AI_RUN_TIMEOUT_MS` to change it.
- Docs content is compiled into the Worker at build time (`npm run content:bundle` runs automatically).
- Each request gets its own database connection; Hyperdrive pools them, which keeps it fast.
- Previews and Codexa hosting need `services/runner` on a Linux server (see `docs/RUNTIME.md`). Point
  `RUNNER_URL` at it to turn those features on.
