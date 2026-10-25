import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { getRuntime } from "@/lib/services/runtime";

type Ctx = { params: Promise<{ id: string }> };

/** GET /projects/:id/runtime → { session | null, runnerAvailable } (also acts as the heartbeat). */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "viewer");
  const state = await getRuntime(project);
  return json(state);
});
