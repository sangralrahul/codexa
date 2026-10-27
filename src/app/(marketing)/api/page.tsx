import { routeMetadata } from "@/lib/seo";
import { DevArticle } from "@/components/docs/dev-article";

export const metadata = routeMetadata("/api");

const md = `
The Codexa HTTP API is the interface the web application itself uses. It is JSON over HTTPS, scoped to workspaces, and authenticated with the session cookie.

## Base paths

| Prefix            | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| \`/api/auth/*\`     | Sign up, sign in, sign out, verification, password reset |
| \`/api/v1/*\`       | Workspaces, projects, files, snapshots, AI, runtime, deployments, integrations, billing, forms, search |
| \`/api/webhooks/*\` | Inbound events from Stripe and Razorpay              |

## Request format

- \`Content-Type: application/json\` for bodies. Bodies are validated with a schema; unknown or malformed fields fail with 400.
- Path parameters are ids (\`/api/v1/projects/:id\`). Query parameters are used for filters (\`?workspaceId=\`, \`?q=\`).
- The session cookie is sent automatically by browsers; non-browser clients store it from the login response. Personal tokens are planned; see [authentication](/api/authentication).

## Response format

Success responses return the resource under a named key:

\`\`\`json
{ "project": { "id": "prj_…", "name": "task-tracker", "workspaceId": "ws_…", "templateId": "vite-react-starter" } }
\`\`\`

Lists return an array under a plural key (\`{ "projects": [...] }\`). Paging is cursor-less today; lists are bounded per workspace.

## Error format

Every error, from any endpoint, has the same shape:

\`\`\`json
{ "error": { "code": "bad_request", "message": "Validation failed", "details": [{ "path": "name", "message": "Too short" }] } }
\`\`\`

| Status | Code(s)                                   | Meaning                                                |
| ------ | ----------------------------------------- | ------------------------------------------------------ |
| 400    | \`bad_request\`, \`invalid_token\`            | Validation failed or a one-time link is invalid        |
| 401    | \`unauthorized\`, \`invalid_credentials\`     | No valid session, or wrong email/password              |
| 402    | \`quota_exceeded\`                          | A plan limit was reached; \`details\` names the kind     |
| 403    | \`forbidden\`                               | Your role does not allow the action                    |
| 404    | \`not_found\`                               | Missing resource, or one you cannot access             |
| 409    | \`conflict\`, \`email_taken\`, \`confirmation_required\` | State conflict; destructive SQL needs confirmation |
| 429    | \`rate_limited\`                            | Too many requests; see \`Retry-After\` and \`resetAt\`     |
| 503    | \`ai_not_configured\`                       | The deployment has no AI provider key                  |
| 500    | \`internal\`                                | Unexpected error; the message carries no internals     |

The [troubleshooting page](/docs/troubleshooting) explains each code from the user's side.

## Rate limits

Limits are applied per IP or per account depending on the endpoint and are deliberately conservative on public and sensitive routes:

| Endpoints                      | Limit                              |
| ------------------------------ | ---------------------------------- |
| Sign up, sign in, password reset | Small per-IP and per-email windows |
| AI generate                    | Per workspace, on top of plan quotas |
| Public forms (\`/forms/*\`)      | 5 submissions per 15 minutes per IP |
| Search                         | 120 requests per minute per IP     |

A 429 response includes \`Retry-After\` (seconds) and \`error.resetAt\` (ISO timestamp).

## Streaming

Two endpoints stream server-sent events instead of returning JSON once: AI generation (\`POST .../ai/generate\`) and runtime logs (\`GET .../runtime/logs\`). Events are \`event: <name>\` lines followed by a single-line JSON \`data:\` payload. See [Generations](/api/generations).

## Versioning

\`v1\` is the only version. Breaking changes will be introduced under a new prefix; additive changes (new fields, new endpoints) happen in place and are recorded in the [changelog](/changelog).
`;

export default function ApiOverviewPage() {
  return <DevArticle path="/api" markdown={md} crumbs={[{ name: "Developers", path: "/developers" }, { name: "API", path: "/api" }]} />;
}
