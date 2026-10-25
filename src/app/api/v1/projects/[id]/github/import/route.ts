import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { serializeProject } from "@/app/api/v1/projects/_lib/serialize";
import { pullIntoProject } from "@/lib/github/sync";
import { githubFor } from "@/app/api/v1/integrations/github/_lib";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  repo: z.string().trim().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Repository must be owner/name"),
  branch: z.string().trim().max(255).optional(),
});

/**
 * POST /api/v1/projects/:id/github/import { repo, branch? }
 * Links an existing project to a repository and replaces its files with the branch content
 * (a "Before pull" snapshot is taken first). To create a new project from a repository use
 * POST /api/v1/integrations/github/import.
 */
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "editor");
  const body = await parseBody(req, schema);
  const { client } = await githubFor(user, "import");
  const result = await pullIntoProject({ client, project, userId: user.id, repo: body.repo, branch: body.branch });
  return json({ project: serializeProject(result.project), imported: result.imported, skipped: result.skipped, truncated: result.truncated, paths: result.paths });
});
