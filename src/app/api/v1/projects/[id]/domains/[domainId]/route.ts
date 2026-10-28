import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { removeDomain } from "@/lib/services/publishing";

type Ctx = { params: Promise<{ id: string; domainId: string }> };

/** DELETE /projects/:id/domains/:domainId (owner or admin). */
export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, domainId } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "admin");
  await removeDomain(project, user, domainId);
  return json({ ok: true });
});
