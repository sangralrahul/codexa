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

1. A Cloudflare account on the **Workers Paid** plan. The Worker is more than 3 MB, and containers
   need it.
2. **Node.js 22** and this repository on your computer.
3. Your keys: an **Anthropic API key** (for AI) and a **Customer.io App API key** (for email).
4. For live previews and published sites only:
   - **A domain added to Cloudflare.** Any domain works, even one with another name, because
     Codexa uses a sub-address of it (`codexa.yourdomain.com`).
   - **Docker Desktop**, installed and running when you deploy. Wrangler uses it to build the
     container image. On Windows, start Docker Desktop and wait until it says "Engine running".

Without a domain, Codexa still runs at `https://codexa.<your-subdomain>.workers.dev`. Everything
works except live preview, Run and Codexa hosting, and the app says plainly that those need a domain.
You can add a domain later.

## Step by step

Run every command in the `codexa` folder. The commands are the same on Windows (Command Prompt or
PowerShell), macOS and Linux. Steps 2 and 3 are only for when you have a domain.

### 1. Install and log in

```bash
npm install
npx wrangler login
```

### 2. Put your domain in `wrangler.jsonc` (with a domain)

Open `wrangler.jsonc`. In each place below, remove the `//` at the start of the lines and replace
`example.com` with your domain.

The `containers` block (live previews and builds):

```jsonc
"containers": [
  {
    "name": "codexa-runner",
    ...
  }
],
```

The `routes` block:

```jsonc
"routes": [
  { "pattern": "codexa.example.com", "custom_domain": true },
  { "pattern": "*-preview.example.com/*", "zone_name": "example.com" },
  { "pattern": "*-sites.example.com/*", "zone_name": "example.com" }
],
```

And in `vars`, fill in the two empty values:

```jsonc
"PREVIEW_HOST": "-preview.example.com",
"DEPLOY_HOST": "-sites.example.com",
```

What these mean:

- `codexa.example.com` is where people open Codexa.
- `abc123-preview.example.com` addresses show live previews while someone builds an app.
- `my-app-sites.example.com` addresses are apps people published with **Deploy → Codexa hosting**.

The dash matters. Previews stay one level under your domain, so Cloudflare's free certificate covers
them and you don't have to buy one.

### 3. One DNS record (with a domain)

In the Cloudflare dashboard, open your domain, then **DNS → Records → Add record**:

| Type | Name | IPv6 address | Proxy status |
| --- | --- | --- | --- |
| AAAA | `*` | `100::` | Proxied (orange cloud) |

`100::` is a placeholder. Cloudflare sends preview and site traffic to your Worker and never uses
that address. The records you already have (like `www`) keep working, because a specific name always
wins over `*`. You don't need a record for `codexa.example.com`: the deploy creates it.

### 4. Add your secrets

Each command asks you to paste a value. The value is stored encrypted in Cloudflare and never goes
into the code.

```bash
npx wrangler secret put SESSION_SECRET          # a long random string (see below)
npx wrangler secret put ENCRYPTION_KEY          # a different long random string. Never change it later.
npx wrangler secret put ANTHROPIC_API_KEY       # your Anthropic key
npx wrangler secret put CUSTOMERIO_APP_API_KEY  # your Customer.io App API key
npx wrangler secret put CUSTOMERIO_REGION       # us or eu (where your Customer.io workspace is)
npx wrangler secret put EMAIL_FROM              # e.g. Codexa <no-reply@yourdomain.com> (domain verified in Customer.io)
npx wrangler secret put ADMIN_EMAILS            # your email: that account becomes admin when you sign up
npx wrangler secret put APP_URL                 # https://codexa.example.com (with a domain), or see step 5
```

The first time you run `wrangler secret put`, it may ask whether to create the Worker. Answer yes.

To make a random string, run this and copy what it prints. Do it once for each secret, so the two are
different:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

If `ENCRYPTION_KEY` ever changes, the secrets people saved (environment variables, connected services)
can no longer be read. Keep a copy somewhere safe.

### 5. Deploy

If you uncommented `containers` in step 2, start Docker Desktop first. Then:

```bash
npm run cf:deploy
```

This builds Codexa (and the container image, if containers are on), then uploads it. The first time,
Cloudflare also creates the D1 database (`codexa`) and the R2 bucket (`codexa-storage`). The first
deploy takes several minutes. Later ones are faster.

**Without a domain:** at the end it prints your address, like
`https://codexa.yourname.workers.dev`. Set it as `APP_URL` now, so links in emails point to it:

```bash
npx wrangler secret put APP_URL
```

### 6. Create the database tables

Once, after the first deploy, and again whenever an update adds a file to the `drizzle/` folder:

```bash
npm run db:migrate:remote
```

### 7. Sign up and check

Open your address, sign up with the email you put in `ADMIN_EMAILS`, and click the link in the
verification email. You can now open `/admin`.

Then open `/status`. Web application and Database should say **Operational**. AI generation and Email
delivery should say **Configured, not probed**: that page doesn't call Anthropic or Customer.io, so it
doesn't use up any quota. Runner should say **Operational** with a domain, or **Not configured** with
a note about the domain without one.

With a domain, create a project and press **Run**. The first start of a project's container takes a
few seconds longer while Cloudflare starts it.

If you signed up before setting `ADMIN_EMAILS`, run this instead:

```bash
npm run user:admin -- make-admin you@example.com --remote
```

## Add your own domain later

If you started on `workers.dev`: do steps 2 and 3, set `APP_URL` to `https://codexa.yourdomain.com`
(`npx wrangler secret put APP_URL`), start Docker Desktop, and run `npm run cf:deploy` again.

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

For previews and hosted sites, turn on the `containers` block in `wrangler.jsonc` and keep Docker
running. They open at `http://<code>.preview.localhost:8787` and `http://<name>.sites.localhost:8787`.
Browsers send `*.localhost` to your own computer, so this works without any DNS setup.

## If something doesn't work

| What you see | What to do |
| --- | --- |
| `npm run cf:deploy` fails with a Docker error | Start Docker Desktop, wait for "Engine running", and try again. Without a domain, check that the `containers` block in `wrangler.jsonc` still has `//` in front. |
| Pages show a database error | Run `npm run db:migrate:remote` (step 6). |
| Previews don't open | Check the `*` DNS record (step 3) and the two `routes` with the dash (step 2). |
| Previews open but show "not found" | `PREVIEW_HOST` in `wrangler.jsonc` must match your route (`-preview.example.com`, with the dash). Deploy again after you change it. |
| The editor says previews need a domain | `PREVIEW_HOST` and `DEPLOY_HOST` are empty in `wrangler.jsonc` (step 2). |
| No emails arrive | Check `CUSTOMERIO_APP_API_KEY`, `CUSTOMERIO_REGION`, and that the `EMAIL_FROM` domain is verified in Customer.io. |
| Links in emails point to localhost | Set `APP_URL` with `npx wrangler secret put APP_URL`. |
| Settings you made don't seem to apply | Don't keep a `.env` or `.env.local` file in the `codexa` folder when you deploy: the build copies it into the Worker. |
| See the live logs | `npx wrangler tail`, or Workers & Pages → codexa → Logs in the dashboard. |

## How it fits together (for developers)

- Preview and site addresses come from `src/lib/hosts.ts`: a `PREVIEW_HOST`/`DEPLOY_HOST` that
  starts with `-` attaches the label directly (`abc-preview.example.com`), otherwise as a subdomain
  (`abc.preview.example.com`, which needs an advanced certificate on Cloudflare). Both empty means
  no domain: containers stay off and the app shows `runtimeSetupHint()` (`src/lib/env.ts`).
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
