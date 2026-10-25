import { routeMetadata } from "@/lib/seo";
import { DevArticle } from "@/components/docs/dev-article";

export const metadata = routeMetadata("/api/authentication");

const md = `
The API authenticates requests with the same **session cookie** the web application uses. There is no separate API key scheme yet.

## Session cookies (available)

1. \`POST /api/auth/login\` with \`{ "email", "password" }\`. On success the response sets an httpOnly, \`SameSite=Lax\` cookie and returns \`{ "user": { … } }\`.
2. Send the cookie on every later request. Browsers do this automatically for same-origin calls; \`curl\` needs \`-c\`/\`-b\`.
3. \`GET /api/auth/me\` returns the current user or 401.
4. \`POST /api/auth/logout\` revokes the session.

\`\`\`bash
curl -c cookies.txt -X POST "$HOST/api/auth/login" \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"you@example.com","password":"…"}'

curl -b cookies.txt "$HOST/api/auth/me"
\`\`\`

The cookie value is a random token; only its hash is stored, and sessions expire. Signing in from a script creates a normal session that appears in your account's session list and can be revoked there.

> Warning: Do not embed your password in CI or shared scripts. Until API tokens ship, use a dedicated account with the minimum workspace role for automation, and rotate its password.

## Authorization

Authentication says who you are; every endpoint additionally checks **what your role allows** in the workspace that owns the resource:

| Role   | Typical API access                                                   |
| ------ | -------------------------------------------------------------------- |
| viewer | \`GET\` on projects, files, snapshots, activity, runtime status, deployments |
| editor | Everything above plus writes: files, snapshots, env vars, AI runs, runtime, deployments, share links |
| admin  | Everything above plus members, invitations and integrations          |
| owner  | Everything above plus billing and workspace deletion                 |

A request outside your role returns \`403 forbidden\`. A resource in a workspace you are not a member of returns \`404 not_found\`.

## Email flows

| Endpoint                        | Body                          | Notes                                    |
| ------------------------------- | ----------------------------- | ---------------------------------------- |
| \`POST /api/auth/signup\`         | \`{ email, password, name? }\`  | 409 \`email_taken\` if the address exists  |
| \`POST /api/auth/verify-email\`   | \`{ token }\`                   | 400 \`invalid_token\` when used or expired |
| \`POST /api/auth/resend-verification\` | —                        | Rate limited                             |
| \`POST /api/auth/forgot-password\`| \`{ email }\`                   | Always 200 so addresses cannot be probed |
| \`POST /api/auth/reset-password\` | \`{ token, password }\`         | Revokes other sessions                   |

## GitHub sign-in

\`GET /api/auth/github/start\` redirects to GitHub and \`GET /api/auth/github/callback\` completes the flow, only when the operator has configured an OAuth app. The reference marks these endpoints as planned until their handlers are present.

## API tokens (planned)

Personal access tokens, sent as \`Authorization: Bearer <token>\`, scoped to a workspace and role, with creation and revocation under account settings. This is listed under "Next" on the [roadmap](/roadmap). The reference page shows \`POST /api/v1/tokens\` as planned so the intent is visible; it does not exist yet and calling it returns 404.
`;

export default function ApiAuthPage() {
  return <DevArticle path="/api/authentication" markdown={md} />;
}
