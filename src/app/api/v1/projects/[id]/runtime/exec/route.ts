import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertProjectAccess } from "@/lib/services/access";
import { execRuntime, syncRuntime } from "@/lib/services/runtime";
import { logActivity } from "@/lib/services/projects";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  command: z.enum(["install", "build", "test", "typecheck", "lint"]),
  sync: z.boolean().optional(),
  timeoutMs: z.number().int().min(1000).max(600_000).optional(),
});

/** POST /projects/:id/runtime/exec { command } → { exitCode, output, timedOut, durationMs } (allowlisted commands only). */
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "editor");
  const body = await parseBody(req, schema);
  await enforceRateLimit(`runtime:exec:${user.id}`, 60, 60_000);
  if (body.sync !== false) await syncRuntime(project);
  const result = await execRuntime(project, body.command, { timeoutMs: body.timeoutMs });
  await logActivity(id, user.id, "runtime.exec", `Ran "${body.command}" (exit ${result.exitCode}${result.timedOut ? ", timed out" : ""})`, { command: body.command, exitCode: result.exitCode, durationMs: result.durationMs });
  return json(result);
});
