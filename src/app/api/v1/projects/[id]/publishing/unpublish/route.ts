import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { getPublishing, unpublish } from "@/lib/services/publishing";

type Ctx = { params: Promise<{ id: string }> };

/** POST /projects/:id/publishing/unpublish → { publishing } (owner or admin). The version stays in history. */
export const POST = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project, workspace } = await assertProjectAccess(user, id, "admin");
  await unpublish(project, user);
  return json({ publishing: await getPublishing(project, workspace) });
});
