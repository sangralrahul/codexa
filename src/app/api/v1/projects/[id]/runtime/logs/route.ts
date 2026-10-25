import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { runtimeLogsStream, runtimeLogsTail } from "@/lib/services/runtime";

type Ctx = { params: Promise<{ id: string }> };

const SSE_HEADERS = { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store, no-transform", connection: "keep-alive", "x-accel-buffering": "no" };

/**
 * GET /projects/:id/runtime/logs          → SSE relay of the runner's log stream
 *   events: log { ts, stream, line } · status { status, previewUrl } · end { reason }
 * GET /projects/:id/runtime/logs?tail=N   → JSON { lines }
 */
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "viewer");
  const url = new URL(req.url);
  const tail = url.searchParams.get("tail");
  if (tail !== null) {
    const res = await runtimeLogsTail(project, Math.min(2000, Math.max(1, Number(tail) || 200)));
    return json({ lines: res?.lines ?? [], status: res?.status ?? "stopped" });
  }
  const upstream = await runtimeLogsStream(project, req.signal);
  if (!upstream?.body) {
    const body = `event: status\ndata: ${JSON.stringify({ status: "stopped", previewUrl: null })}\n\nevent: end\ndata: ${JSON.stringify({ reason: "No runtime is running for this project" })}\n\n`;
    return new Response(body, { status: 200, headers: SSE_HEADERS });
  }
  return new Response(upstream.body, { status: 200, headers: SSE_HEADERS });
});
