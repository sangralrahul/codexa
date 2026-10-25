# Deploying Codexa on Cloudflare

Everything in Codexa runs on Cloudflare except email, which goes through Customer.io.

| Part of Codexa | Cloudflare product |
| --- | --- |
| Website and app (pages, sign-in, editor, API) | **Workers** (Next.js through OpenNext) |
| Database (users, projects, files, billing, jobs) | **D1** |
| Version-history snapshots and hosted sites | **R2** |
| Live preview, Run, terminal commands, builds | **Containers**: one per project, started on demand |
| "Who's online" in the editor | **Durable Objects** (WebSockets) |
| Background jobs (email retries, cleanup) | **Cron Triggers**: every 5 minutes |
| Email (verification, password reset, invites) | Customer.io (not Cloudflare) |

You don't create the database, bucket or containers by hand. `npm run cf:deploy` creates them the
first time.

## What you need

1. A Cloudflare account on the **Workers Paid** plan. Containers and the Worker's size (more than
   3 MB) need it.
2. **A domain added to Cloudflare** (for example `example.com`). Live previews and hosted sites need
   their own sub-addresses (`<something>.preview.example.com`). The free `workers.dev` address can't do
   that.
3. **Docker Desktop**, installed and running. Wrangler uses it to build the container image when you
   deploy. On Windows, start Docker Desktop and wait until it says "Engine running".
4. **Node.js 22** and this repository on your computer.
5. Your keys: an **Anthropic API key** (for AI) and a **Customer.io App API key** (for email).

## Step by step

Run every command in the `codexa` folder. The commands are the same on Windows (Command Prompt or
PowerShell), macOS and Linux.

### 1. Install and log in

```bash
npm install
npx wrangler login
```

### 2. Put your domain in `wrangler.jsonc`

Open `wrangler.jsonc` and find the `routes` block near the end. Remove the `//` at the start of those
five lines and replace `example.com` with your domain:

```jsonc
"routes": [
  { "pattern": "codexa.example.com", "custom_domain": true },
  { "pattern": "*.preview.example.com/*", "zone_name": "example.com" },
  { "pattern": "*.sites.example.com/*", "zone_name": "example.com" }
],
```

Then change the `vars` block just below it:

```jsonc
"vars": {
  "NODE_ENV": "production",
  "APP_URL": "https://codexa.example.com",
  "PREVIEW_HOST": "preview.example.com",
  "DEPLOY_HOST": "sites.example.com",
  "PREVIEW_PROTOCOL": "https"
}
```

What these mean:

- `codexa.example.com` is where people open Codexa. You can use any name, or the bare domain.
- `<code>.preview.example.com` addresses show live previews while someone builds an app.
- `<app-name>.sites.example.com` addresses are apps people published with **Deploy → Codexa hosting**.

### 3. DNS records and a certificate for previews and sites

In the Cloudflare dashboard, open your domain.

**DNS → Records → Add record**, twice:

| Type | Name | IPv6 address | Proxy status |
| --- | --- | --- | --- |
| AAAA | `*.preview` | `100::` | Proxied (orange cloud) |
| AAAA | `*.sites` | `100::` | Proxied (orange cloud) |

`100::` is a placeholder. Cloudflare sends this traffic to your Worker and never uses that address.
You don't need a record for `codexa.example.com`: the deploy creates it.

**SSL/TLS → Edge Certificates → Order an advanced certificate.** Cloudflare's free certificate only
covers one level (`*.example.com`). Previews are two levels deep (`abc.preview.example.com`), so they
need an advanced certificate. This is a paid add-on (Advanced Certificate Manager). Add these
hostnames: `example.com`, `*.preview.example.com`, `*.sites.example.com`. It is usually ready within
a few minutes.

> **Option without the add-on:** use two other domains for previews and sites, for example
> `PREVIEW_HOST` = `myapp-preview.com` and `DEPLOY_HOST` = `myapp-sites.com`. Each gets a
> `*` AAAA record and a `*.myapp-preview.com/*` route, which the free certificate covers. This also
> keeps people's generated code on a different site from your Codexa login, which is a little safer.

### 4. Add your secrets

Each command asks you to paste a value. The value is stored encrypted in Cloudflare and never goes
into the code.

```bash
npx wrangler secret put SESSION_SECRET          # a long random string (see below)
npx wrangler secret put ENCRYPTION_KEY          # a different long random string. Never change it later.
npx wrangler secret put ANTHROPIC_API_KEY       # your Anthropic key
npx wrangler secret put CUSTOMERIO_APP_API_KEY  # your Customer.io App API key
npx wrangler secret put CUSTOMERIO_REGION       # us or eu (where your Customer.io workspace is)
npx wrangler secret put EMAIL_FROM              # e.g. Codexa <no-reply@example.com> (domain verified in Customer.io)
npx wrangler secret put ADMIN_EMAILS            # your email: that account becomes admin when you sign up
```

To make a random string, run this and copy what it prints. Do it once for each secret, so the two are
different:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

If `ENCRYPTION_KEY` ever changes, the secrets people saved (environment variables, connected services)
can no longer be read. Keep a copy somewhere safe.

### 5. Deploy

Start Docker Desktop first, then:

```bash
npm run cf:deploy
```

This builds Codexa and the container image, then uploads both. The first time, Cloudflare also
creates the D1 database (`codexa`) and the R2 bucket (`codexa-storage`). The first deploy takes
several minutes. Later ones are faster.

### 6. Create the database tables

Once, after the first deploy, and again whenever an update adds a file to the `drizzle/` folder:

```bash
npm run db:migrate:remote
```

### 7. Sign up and check

Open `https://codexa.example.com`, sign up with the email you put in `ADMIN_EMAILS`, and click the
link in the verification email. You can now open `/admin`.

Then open `https://codexa.example.com/status`. Web application, Database and Runner should say
**Operational**. AI generation and Email delivery should say **Configured, not probed** (that page doesn't call
Anthropic or Customer.io, so it doesn't use up any quota). Create a project and press **Run**. The first start of a project's
container takes a few seconds longer while Cloudflare starts it.

If you signed up before setting `ADMIN_EMAILS`, run this instead:

```bash
npm run user:admin -- make-admin you@example.com --remote
```

## Updating later

```bash
git pull
npm install
npm run cf:deploy
npm run db:migrate:remote
```

## Try it on your computer first (optional)

`npm run cf:preview` builds everything and runs it in Cloudflare's runtime on your computer, with real
containers through Docker, at http://localhost:8787.

1. Copy `.dev.vars.example` to `.dev.vars` and fill it in (same values as step 4).
2. Create the local database once: `npm run db:migrate`.
3. Run `npm run cf:preview`.

Previews open at `http://<code>.preview.localhost:8787` and hosted sites at
`http://<name>.sites.localhost:8787`. Browsers send `*.localhost` to your own computer, so this works
without any DNS setup.

## If something doesn't work

| What you see | What to do |
| --- | --- |
| `npm run cf:deploy` fails with a Docker error | Start Docker Desktop, wait for "Engine running", and try again. |
| Pages show a database error | Run `npm run db:migrate:remote` (step 6). |
| Previews don't open, or the browser shows a certificate warning | Check the two DNS records and the advanced certificate (step 3). |
| Previews open but show "not found" | `PREVIEW_HOST` in `wrangler.jsonc` must match your route (`preview.example.com`). Deploy again after you change it. |
| No emails arrive | Check `CUSTOMERIO_APP_API_KEY`, `CUSTOMERIO_REGION`, and that the `EMAIL_FROM` domain is verified in Customer.io. |
| Links in emails point to localhost | Set `APP_URL` in `wrangler.jsonc` (step 2) and deploy again. |
| See the live logs | `npx wrangler tail`, or Workers & Pages → codexa → Logs in the dashboard. |

## How it fits together (for developers)

- `worker/index.ts` is the Worker entry. It routes `<token>.<PREVIEW_HOST>` to the project's
  `ProjectSandbox` Durable Object (`worker/sandbox.ts`), which starts the project's container and
  proxies to the runner inside it (`services/runner` with the `process` driver, image in
  `containers/runner/`). It sends `<slug>.<DEPLOY_HOST>` to `worker/sites.ts`, which serves the live
  deployment's files from R2, and `/realtime` to the `PresenceRoom` Durable Object
  (`worker/presence.ts`). Everything else goes to Next.js. Its `scheduled()` handler calls the
  signed `/api/internal/cron` route, which runs due jobs.
- The app talks to a project's container through `src/lib/runtime/client.ts`
  (`runnerFor(projectId)`). With `RUNNER_URL` set (local `npm run dev`), the same client talks to a
  standalone runner instead.
- D1 has no interactive transactions, so multi-row writes use `db.batch()` (`runBatch` in
  `src/db/index.ts`), with IDs generated up front. Inserts are chunked to stay under D1's
  100-parameter limit. Snapshot contents live in R2 because D1 rows are capped at 2 MB.
- Tests run against a local D1 copy (`.wrangler/test-state`) through Wrangler's `getPlatformProxy`.
