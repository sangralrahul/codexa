import { routeMetadata } from "@/lib/seo";
import { DevArticle } from "@/components/docs/dev-article";

export const metadata = routeMetadata("/api/deployments");

const md = `
Deployment and runtime endpoints are owned by the runner integration. They are part of the v1 contract and the [reference](/api/reference#group-deployments) shows, per endpoint, whether the handler is present in the current build.

## Runtime (previews)

| Method | Path                                   | Role   | Purpose                                                       |
| ------ | -------------------------------------- | ------ | ------------------------------------------------------------- |
| GET    | \`/api/v1/projects/:id/runtime\`         | viewer | \`{ session | null, runnerAvailable }\`                         |
| POST   | \`/api/v1/projects/:id/runtime/start\`   | editor | Start a sandbox → \`{ session: { id, status, previewUrl } }\`   |
| POST   | \`/api/v1/projects/:id/runtime/stop\`    | editor | Stop it                                                       |
| GET    | \`/api/v1/projects/:id/runtime/logs\`    | viewer | SSE stream of \`{ ts, stream: "stdout" | "stderr" | "system", line }\` |
| POST   | \`/api/v1/projects/:id/runtime/sync\`    | editor | Push changed files into the running sandbox (\`{ paths? }\`)    |
| POST   | \`/api/v1/projects/:id/runtime/exec\`    | editor | \`{ command: "install" | "build" | "test" | "typecheck" }\` → \`{ exitCode, output }\` |

\`exec\` accepts only the four allow-listed commands; anything else is a 400. When the runner is unreachable, \`start\` and \`exec\` return 503 and \`GET /runtime\` reports \`runnerAvailable: false\`. Runtime minutes are metered (\`quota_exceeded\` with \`kind: "runtime_minutes"\`).

## Deployments

| Method | Path                                                   | Role   | Purpose                                      |
| ------ | ------------------------------------------------------ | ------ | -------------------------------------------- |
| POST   | \`/api/v1/projects/:id/deployments\`                     | editor | \`{ provider: "codexa" | "vercel" }\` → \`{ deployment }\` |
| GET    | \`/api/v1/projects/:id/deployments\`                     | viewer | History                                      |
| GET    | \`/api/v1/projects/:id/deployments/:did\`                | viewer | One deployment with \`buildLog\`               |
| POST   | \`/api/v1/projects/:id/deployments/:did/rollback\`       | editor | Make an earlier successful deployment live   |

A deployment record looks like:

\`\`\`json
{
  "deployment": {
    "id": "dep_…",
    "provider": "codexa",
    "status": "building",
    "url": null,
    "createdAt": "2026-10-24T10:00:00.000Z",
    "buildLog": ""
  }
}
\`\`\`

\`status\` moves through \`queued\` → \`building\` → \`live\` or \`failed\`. Poll \`GET .../deployments/:did\` for progress; there is no SSE stream for build logs yet.

- \`provider: "codexa"\` builds in a sandbox and serves static output. Node + Express projects are rejected with 400 because static hosting cannot run them.
- \`provider: "vercel"\` requires a Vercel connection in the workspace; without one the response is 400 with a message pointing at Integrations. The adapter has not been verified end-to-end against real Vercel accounts.

Deployments per month are metered by plan (\`quota_exceeded\`, \`kind: "deployment"\`). Rollbacks are not metered.

## Custom domains

There is no API for domains yet; they are managed in project settings with manual CNAME setup. See [Custom domains](/docs/custom-domains).
`;

export default function ApiDeploymentsPage() {
  return <DevArticle path="/api/deployments" markdown={md} />;
}
