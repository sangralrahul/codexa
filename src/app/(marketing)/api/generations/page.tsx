import { routeMetadata } from "@/lib/seo";
import { DevArticle } from "@/components/docs/dev-article";

export const metadata = routeMetadata("/api/generations");

const md = `
AI runs ("generations") are started with one request and observed as a stream of server-sent events. Everything here requires the **editor** role on the project and counts against the workspace's AI quotas.

## Check configuration first

\`GET /api/v1/projects/:id/ai/status\` returns \`{ "configured": boolean, "provider", "model" }\`. When \`configured\` is false, \`generate\` returns \`503 ai_not_configured\`; do not retry until the operator configures a key.

## Start a run

\`\`\`http
POST /api/v1/projects/:id/ai/generate
Content-Type: application/json

{ "conversationId": "cnv_…", "prompt": "Add a dark mode toggle…", "mode": "build" }
\`\`\`

- \`conversationId\` is optional; omit it to start a new conversation.
- \`mode\` is \`build\` (default), \`ask\` (read-only tools) or \`fix\`.
- Prompts are limited to 8,000 characters (400 otherwise).
- Quota is checked before the provider is called; \`402 quota_exceeded\` names \`ai_request\` or \`ai_tokens\`.

The response is \`text/event-stream\`. Each event is \`event: <name>\` followed by one \`data:\` line of JSON.

## Events

| Event         | Data                                                            | When                                      |
| ------------- | --------------------------------------------------------------- | ----------------------------------------- |
| \`run\`         | \`{ runId, conversationId, messageId, userMessageId, mode, provider, model, mock }\` | First event; ids for later calls |
| \`stage\`       | \`{ stage, detail? }\`                                            | \`queued\`, \`loading_context\`, \`planning\`, \`working\`, \`validating\`, \`repairing\`, \`done\` |
| \`plan\`        | \`{ steps: string[] }\`                                           | After planning                            |
| \`text\`        | \`{ delta }\`                                                     | Streamed assistant text                   |
| \`tool_call\`   | \`{ id, name, input, summary }\`                                  | The agent invokes a tool                  |
| \`tool_result\` | \`{ id, name, output, isError? }\`                                | Tool finished; output truncated to 6,000 chars |
| \`file_change\` | \`{ path, action: "create" | "update" | "delete" }\`              | A file was written                        |
| \`usage\`       | \`{ inputTokens, outputTokens }\`                                 | Cumulative provider usage                 |
| \`done\`        | \`{ runId, status: "succeeded" | "failed" | "cancelled", changedFiles, snapshotBeforeId? }\` | Last event |
| \`error\`       | \`{ code, message }\`                                             | Terminal failure (also ends the stream)   |

## Reading the stream

\`\`\`ts
const res = await fetch(\`/api/v1/projects/\${id}/ai/generate\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt, mode: "build" }),
});
const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = "";
for (;;) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  let i: number;
  while ((i = buffer.indexOf("\\n\\n")) !== -1) {
    const block = buffer.slice(0, i); buffer = buffer.slice(i + 2);
    const event = /^event: (.*)$/m.exec(block)?.[1] ?? "message";
    const data = JSON.parse(/^data: (.*)$/m.exec(block)?.[1] ?? "null");
    handle(event, data);
  }
}
\`\`\`

Closing the connection does **not** cancel the run; call cancel explicitly.

## Inspect, cancel, revert

| Method | Path                                             | Purpose                                                     |
| ------ | ------------------------------------------------ | ----------------------------------------------------------- |
| GET    | \`/api/v1/projects/:id/ai/runs/:runId\`            | \`{ run, diff }\` where \`diff\` compares the pre-run snapshot to current files |
| POST   | \`/api/v1/projects/:id/ai/runs/:runId/cancel\`     | Stop at the next tool boundary                              |
| POST   | \`/api/v1/projects/:id/ai/runs/:runId/revert\`     | Restore the pre-run snapshot                                |

## Conversations

| Method | Path                                                     | Purpose                 |
| ------ | -------------------------------------------------------- | ----------------------- |
| GET    | \`/api/v1/projects/:id/ai/conversations\`                  | List                    |
| POST   | \`/api/v1/projects/:id/ai/conversations\`                  | Create                  |
| GET    | \`/api/v1/projects/:id/ai/conversations/:cid/messages\`    | Messages with their parts (stages, tool calls, text) |

Only the last ten messages of a conversation are sent to the model as history.

## Limits recap

40 tool calls, 60 turns, 25 minutes, 16k output tokens per model call, 2 repair attempts and 2 provider retries per run. See [AI agent](/docs/ai-agent#limits).
`;

export default function ApiGenerationsPage() {
  return <DevArticle path="/api/generations" markdown={md} />;
}
