import { handler, json, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { cancelRun } from "@/lib/ai/runs";

type Ctx = { params: Promise<{ id: string; runId: string }> };

/** POST → { run } with status cancelled (no-op if the run already finished). */
export const POST = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, runId } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  const run = await cancelRun(id, runId);
  if (!run) throw notFound("Run");
  return json({ run });
});
