import { z } from "zod";
import { badRequest, handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { serializeProject } from "@/app/api/v1/projects/_lib/serialize";
import { pullIntoProject } from "@/lib/github/sync";
import { githubFor } from "@/app/api/v1/integrations/github/_lib";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ branch: z.string().trim().max(255).optional() }).default({});

/** POST /api/v1/projects/:id/github/pull { branch? } → re-import the linked branch (snapshot "Before pull" first). */
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "editor");
  const text = await req.text();
  let raw: unknown = {};
  if (text.trim()) {
    try {
      raw = JSON.parse(text);
    } catch {
      throw badRequest("Invalid JSON body");
    }
  }
  const body = schema.parse(raw);
  const { client } = await githubFor(user, "pull");
  const result = await pullIntoProject({ client, project, userId: user.id, branch: body.branch });
  return json({ project: serializeProject(result.project), imported: result.imported, skipped: result.skipped, truncated: result.truncated, paths: result.paths });
});
