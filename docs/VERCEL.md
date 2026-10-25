# Deploying Codexa on Vercel

Vercel hosts the **web app**: public website, docs, accounts, dashboard, editor, version history, AI
generation, teams, billing pages and the admin area. Three parts of Codexa need long-running Linux
processes and **cannot run on Vercel**:

| Service | What it powers | On Vercel |
| --- | --- | --- |
| `services/runner` | Live preview, Run, logs, builds, Codexa hosting deploys | Not available. The workspace shows "Previews are not available on this deployment". Run it on a Linux server and set `RUNNER_URL` to enable these. |
| `services/realtime` | Live presence (who is viewing which file) | Hidden when `NEXT_PUBLIC_REALTIME_URL` is unset. |
| `services/worker` | Background cleanup and email retries | Optional. Run it anywhere with access to the database. |

Everything else works on Vercel without changes.

## 1. Create the database

Use any PostgreSQL 14+ database reachable from Vercel. The simplest is **Neon** from the Vercel
Marketplace (Storage → Create → Neon). It sets `DATABASE_URL` for you. Use the **pooled** connection
string with `sslmode=require`.

## 2. Import the project

1. Vercel dashboard → **Add New → Project** → import `sangralrahul/codexa`.
2. Framework preset: **Next.js** (detected). Leave build and output settings at their defaults.
   Vercel runs `npm run vercel-build`, which optionally migrates the database and then builds.

## 3. Environment variables

Set these under **Settings → Environment Variables** (Production, and Preview if you use previews).

| Variable | Required | Value |
| --- | --- | --- |
| `DATABASE_URL` | yes | Your Postgres URL (set automatically by the Neon integration). |
| `SESSION_SECRET` | yes | Random string, at least 32 characters: `openssl rand -base64 32`. |
| `ENCRYPTION_KEY` | yes | A different random string: `openssl rand -base64 32`. Keep it stable; it decrypts stored secrets. |
| `RUN_MIGRATIONS_ON_BUILD` | recommended | `1` to apply database migrations during each build. |
| `APP_URL`, `NEXT_PUBLIC_APP_URL` | recommended | Your production URL, for example `https://codexa.vercel.app`. When unset, Vercel's own URL is used. |
| `ADMIN_EMAILS` | optional | Comma-separated emails that get the admin role when they sign up. |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | for AI | Enables AI generation. `AI_DEFAULT_PROVIDER` and `AI_DEFAULT_MODEL` choose the model. |
| `CUSTOMERIO_APP_API_KEY`, `CUSTOMERIO_REGION`, `EMAIL_FROM` | for email | Sends verification, reset and invitation emails through Customer.io. Use an **App API key**, set the region to `us` or `eu`, and use a sender address on a domain verified in Customer.io. `RESEND_API_KEY` works instead. See step 5 if you skip email. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | optional | GitHub sign-in, import and push. Callback URL: `https://<your-domain>/api/auth/github/callback`. |
| `STRIPE_*`, `RAZORPAY_*` | optional | Payments. Webhook URLs: `/api/webhooks/stripe` and `/api/webhooks/razorpay`. |
| `RUNNER_URL`, `RUNNER_TOKEN`, `PREVIEW_HOST`, `DEPLOY_HOST` | optional | Only if you run the runner on a separate server (see below). Leave `RUNNER_URL` unset otherwise. |
| `AI_RUN_TIMEOUT_MS` | optional | AI run budget. Defaults to 270000 (4.5 minutes) on Vercel so runs finish before the 300 second function limit. |

`.env.example` documents every variable.

## 4. Deploy

Click **Deploy**. When the build finishes, open the URL and check `/status`. Database should be
"Operational". Runner, AI and email show "Not configured" until you set them up.

## 5. Accounts without an email provider

Without an email provider (`CUSTOMERIO_APP_API_KEY` or `RESEND_API_KEY`), verification emails are stored in the database but not sent. Unverified
accounts can use the editor but cannot publish or invite. Verify an account, or make it an admin,
from your machine:

```bash
DATABASE_URL="<production database url>" npm run user:admin -- verify you@example.com
DATABASE_URL="<production database url>" npm run user:admin -- make-admin you@example.com
```

## 6. Check the deployment

Run the serverless smoke test from your machine against the live URL:

```bash
E2E_NO_SERVER=1 E2E_BASE_URL=https://<your-domain> E2E_DATABASE_URL="<production database url>" \
  npx playwright test tests/e2e/serverless-smoke.spec.ts --project=desktop
```

It signs up a test user, creates a project, edits a file in the editor, takes a snapshot, checks that
the preview, AI and billing states are reported honestly, and visits settings and the admin area.
Delete the `smoke-…@example.com` users afterwards if you don't want them.

## Enabling previews and Codexa hosting later

Run the runner on a Linux VM (see `docs/RUNTIME.md` and `docker-compose.yml`), put its preview proxy
behind wildcard DNS (`*.preview.<domain>` and `*.sites.<domain>`) with HTTPS, then set on Vercel:
`RUNNER_URL=https://<runner-control-host>`, `RUNNER_TOKEN=<shared secret>`,
`PREVIEW_HOST=preview.<domain>`, `DEPLOY_HOST=sites.<domain>`, `PREVIEW_PROTOCOL=https`.
Expose the runner's control API only to Vercel (bearer token plus TLS at minimum).

## How the build adapts to serverless

- `content/` (docs, guides, blog, help, changelog) is included in every function bundle through
  `outputFileTracingIncludes` in `next.config.ts`.
- The API reference reads `src/lib/content/api-manifest.generated.json`, regenerated before every
  build and dev start. Pages never scan the source tree, so bundles stay small.
- The AI generate endpoint sets `maxDuration = 300`, and the agent stops itself before that.
- Production simulation used to verify this: `NEXT_OUTPUT=standalone npm run vercel-build`, then run
  `.next/standalone/server.js` from a folder that contains only the build output.

## Email with Customer.io

1. In Customer.io settings, find **API Credentials** and create an **App API key**. This is different
   from the Track API "Site ID" and key, which Codexa does not use.
2. In Customer.io's email settings, verify the domain you will send from (its sending domains page),
   for example `codexa.yourdomain.com`.
3. In Vercel, set:
   - `CUSTOMERIO_APP_API_KEY` to the App API key
   - `CUSTOMERIO_REGION` to `us` or `eu` (the region of your Customer.io workspace)
   - `EMAIL_FROM` to a sender on the verified domain, for example `Codexa <no-reply@codexa.yourdomain.com>`
4. Redeploy. `/status` shows "Customer.io is configured".
5. Sign up with a real address. The verification email should arrive within a minute. If it doesn't,
   check the delivery log in Customer.io. Codexa also records each attempt and any error in the
   `email_outbox` table.

Codexa sends its own HTML through Customer.io's transactional API, so you don't need to build
templates. It asks Customer.io not to retain message bodies, because they contain one-time links.
Each recipient appears as a person identified by email in your Customer.io workspace.
