import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { logActivity } from "@/lib/services/projects";
import { serializeProject } from "@/app/api/v1/projects/_lib/serialize";
import { unlinkProject } from "@/lib/github/sync";

type Ctx = { params: Promise<{ id: string }> };

/** DELETE /api/v1/projects/:id/github → unlink the repository from the project (files are kept). */
export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "editor");
  const updated = await unlinkProject(project);
  if (project.githubRepo) await logActivity(id, user.id, "github.unlinked", `Unlinked ${project.githubRepo}`);
  return json({ project: serializeProject(updated) });
});
