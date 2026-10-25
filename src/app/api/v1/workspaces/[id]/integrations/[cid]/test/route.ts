import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { enforceRateLimit } from "@/lib/rate-limit";
import { testConnection } from "@/lib/integrations/connections";

type Ctx = { params: Promise<{ id: string; cid: string }> };

/** POST /api/v1/workspaces/:id/integrations/:cid/test → { connection, result } (editor; updates status/lastTestedAt/lastError) */
export const POST = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, cid } = await ctx.params;
  await assertWorkspaceRole(user, id, "editor");
  await enforceRateLimit(`integrations:test:${id}`, 60, 10 * 60 * 1000);
  const { connection, result } = await testConnection(id, cid);
  return json({ connection, result, ok: result.ok, error: result.ok ? null : result.message });
});
