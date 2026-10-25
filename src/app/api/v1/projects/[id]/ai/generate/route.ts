import { z } from "zod";
import { handler, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertProjectAccess } from "@/lib/services/access";
import { executeRun, prepareRun, type AgentEvent } from "@/lib/ai/agent";
import { encodeSseComment, encodeSseEvent } from "@/lib/ai/sse";
import { logger } from "@/lib/logger";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  prompt: z.string().min(1).max(8000),
  conversationId: z.string().min(1).max(64).optional().nullable(),
  mode: z.enum(["build", "ask", "fix"]).optional(),
});

const KEEPALIVE_MS = 15_000;

/**
 * POST /api/v1/projects/:id/ai/generate → SSE stream.
 * Everything that can fail synchronously (auth, role, rate limit, body,
 * provider configuration → 503, quota → 402) happens before the stream opens,
 * so the client receives ordinary JSON errors for those cases.
 */
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project, workspace } = await assertProjectAccess(user, id, "editor");
  await enforceRateLimit(`ai:generate:user:${user.id}`, 20, 60_000);
  const body = await parseBody(req, bodySchema);

  const prepared = await prepareRun({ project, workspaceId: workspace.id, userId: user.id, prompt: body.prompt, mode: body.mode, conversationId: body.conversationId ?? null });

  const encoder = new TextEncoder();
  let keepalive: NodeJS.Timeout | null = null;
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };
      keepalive = setInterval(() => write(encodeSseComment()), KEEPALIVE_MS);
      const onEvent = (event: AgentEvent) => {
        const { type, ...data } = event;
        write(encodeSseEvent(type, data));
      };
      // The run keeps going even if the client disconnects; persistence does
      // not depend on the stream. Cancellation is explicit via /runs/:id/cancel.
      executeRun(prepared, { onEvent })
        .catch((err) => {
          logger.error("ai generate stream crashed", { error: err instanceof Error ? err : String(err) });
          write(encodeSseEvent("error", { message: "The AI run failed unexpectedly.", code: "internal" }));
          write(encodeSseEvent("done", { status: "failed", runId: prepared.runId, changedFiles: [] }));
        })
        .finally(() => {
          if (keepalive) clearInterval(keepalive);
          if (!closed) {
            closed = true;
            try {
              controller.close();
            } catch {
              /* already closed */
            }
          }
        });
    },
    cancel() {
      closed = true;
      if (keepalive) clearInterval(keepalive);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Codexa-Run-Id": prepared.runId,
      "X-Codexa-Conversation-Id": prepared.conversationId,
    },
  });
});
