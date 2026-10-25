import { handler, json, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { getDeployment, toDeploymentDto } from "@/lib/services/deployments";

type Ctx = { params: Promise<{ id: string; did: string }> };

/** GET /projects/:id/deployments/:did → { deployment } with buildLog */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, did } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "viewer");
  const row = await getDeployment(project.id, did);
  if (!row) throw notFound("Deployment");
  return json({ deployment: toDeploymentDto(row, { withLog: true }) });
});
