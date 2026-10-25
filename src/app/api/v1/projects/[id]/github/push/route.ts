import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { pushProject } from "@/lib/github/sync";
import { githubFor } from "@/app/api/v1/integrations/github/_lib";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  message: z.string().trim().min(1, "Write a commit message").max(2000),
  branch: z.string().trim().max(255).optional(),
});

/**
 * POST /api/v1/projects/:id/github/push { message, branch? }
 * → { committed, commitSha, commitUrl, changed, added, deleted }
 * 409 non_fast_forward when the branch moved since the last sync (never force-pushes).
 */
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "editor");
  const body = await parseBody(req, schema);
  const { client } = await githubFor(user, "push");
  const result = await pushProject({ client, project, userId: user.id, message: body.message, branch: body.branch });
  return json(result);
});
