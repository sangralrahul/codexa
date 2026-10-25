import { handler, json, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { deleteConnection, getConnection } from "@/lib/integrations/connections";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string; cid: string }> };

/** GET /api/v1/workspaces/:id/integrations/:cid → { connection } */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, cid } = await ctx.params;
  await assertWorkspaceRole(user, id, "viewer");
  return json({ connection: await getConnection(id, cid) });
});

/** DELETE /api/v1/workspaces/:id/integrations/:cid (admin) */
export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, cid } = await ctx.params;
  await assertWorkspaceRole(user, id, "admin");
  const removed = await deleteConnection(id, cid);
  if (!removed) throw notFound("Connection");
  await audit({ actorId: user.id, workspaceId: id, action: "integration.deleted", targetType: "integration_connection", targetId: cid });
  return new Response(null, { status: 204 });
});
