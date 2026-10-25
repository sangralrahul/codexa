import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { rollbackDeployment, toDeploymentDto } from "@/lib/services/deployments";

type Ctx = { params: Promise<{ id: string; did: string }> };

/** POST /projects/:id/deployments/:did/rollback → { deployment } (admin or owner only: it changes what the public sees). */
export const POST = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, did } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "admin");
  const row = await rollbackDeployment(project, did, user);
  return json({ deployment: toDeploymentDto(row, { withLog: true }) });
});
