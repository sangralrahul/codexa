import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { assertProjectQuota } from "@/app/api/v1/projects/_lib/quota";
import { serializeProject } from "@/app/api/v1/projects/_lib/serialize";
import { importRepositoryAsProject } from "@/lib/github/sync";
import { githubFor } from "../_lib";

const schema = z.object({
  workspaceId: z.string().min(1),
  repo: z.string().trim().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Repository must be owner/name"),
  branch: z.string().trim().max(255).optional(),
  name: z.string().trim().max(100).optional(),
});

/** POST /api/v1/integrations/github/import { workspaceId, repo, branch?, name? } → { project, imported, skipped, truncated } (creates a new project) */
export const POST = handler(async (req) => {
  const user = await requireApiUser();
  const body = await parseBody(req, schema);
  const { workspace } = await assertWorkspaceRole(user, body.workspaceId, "editor");
  const { client } = await githubFor(user, "import");
  await assertProjectQuota(workspace);
  const result = await importRepositoryAsProject({ client, workspaceId: workspace.id, userId: user.id, repo: body.repo, branch: body.branch, name: body.name });
  return json({ project: serializeProject(result.project), imported: result.imported, skipped: result.skipped, truncated: result.truncated, templateId: result.templateId }, { status: 201 });
});
