import { routeMetadata } from "@/lib/seo";
import { DevArticle } from "@/components/docs/dev-article";
import { resolveAllEndpoints } from "@/lib/content/api-registry";

export const metadata = routeMetadata("/developers");

export default function DevelopersPage() {
  const resolved = resolveAllEndpoints();
  const implemented = resolved.filter((e) => e.resolvedStatus === "implemented").length;
  const md = `
Codexa is built on an ordinary HTTP API, and the same API is available to you. This page is the map; the pages in the sidebar have the details.

## What exists today

- **HTTP API** at \`/api/v1/*\` (authentication under \`/api/auth/*\`). Every call the product makes is a call you can make. The [reference](/api/reference) lists ${implemented} implemented endpoints, checked against the server's route files when this page renders.
- **Authentication by session cookie.** Sign in with \`POST /api/auth/login\` and send the cookie on subsequent requests. **Personal API tokens are planned** and not available yet; see [API authentication](/api/authentication).
- **Streaming** for AI runs and runtime logs over server-sent events. See [Generations](/api/generations).
- **Inbound webhooks** from Stripe and Razorpay with signature verification and idempotency. See [Webhooks](/api/webhooks). Outbound webhooks (Codexa calling your URL) do not exist yet.

## What does not exist yet

| Item          | Status                                                      |
| ------------- | ----------------------------------------------------------- |
| API tokens    | Planned; the API accepts only the session cookie today      |
| SDK           | Not yet available; see [/sdk](/sdk)                         |
| CLI           | Not yet available; see [/cli](/cli)                         |
| Outbound webhooks | Not planned for the initial releases                    |
| OpenAPI spec  | Not published; the reference page is generated from a registry in the codebase |

## Conventions

- JSON in, JSON out. Bodies are validated; errors come back as \`{ "error": { "code", "message", "details?" } }\`.
- Resources are scoped to a workspace. Every request is authorised server-side against your role in that workspace.
- Rate limits return 429 with \`Retry-After\`.
- Quota limits return 402 with \`quota_exceeded\`.

## Try it

\`\`\`bash
# Sign in and keep the cookie
curl -c cookies.txt -X POST https://<your-codexa-host>/api/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"you@example.com","password":"…"}'

# List your workspaces
curl -b cookies.txt https://<your-codexa-host>/api/v1/workspaces
\`\`\`
`;
  return (
    <div data-tone="docs">
      <DevArticle path="/developers" markdown={md} />
    </div>
  );
}
