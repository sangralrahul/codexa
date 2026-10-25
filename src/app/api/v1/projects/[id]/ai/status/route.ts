import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { getAiStatus } from "@/lib/ai/keys";
import { getLastRunError } from "@/lib/ai/runs";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/v1/projects/:id/ai/status → { configured, provider, model, mock, missingEnv, lastError } */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { workspace } = await assertProjectAccess(user, id, "viewer");
  const [status, lastError] = await Promise.all([getAiStatus(workspace.id), getLastRunError(id)]);
  return json({ ...status, lastError: lastError ? lastError.slice(0, 4000) : null });
});
