import { z } from "zod";
import { badRequest, handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { createProject, listProjects } from "@/lib/services/projects";
import { getTemplate } from "@/templates";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertProjectQuota } from "./_lib/quota";
import { serializeProject } from "./_lib/serialize";

export const GET = handler(async (req) => {
  const user = await requireApiUser();
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");
  if (!workspaceId) throw badRequest("workspaceId is required");
  await assertWorkspaceRole(user, workspaceId, "viewer");
  const rows = await listProjects(workspaceId);
  return json({ projects: rows.map(serializeProject) });
});

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(1, "Give your project a name").max(100),
  description: z.string().trim().max(500).optional(),
  templateId: z.string().min(1),
  visibility: z.enum(["private", "unlisted", "public"]).optional(),
});

export const POST = handler(async (req) => {
  const user = await requireApiUser();
  const body = await parseBody(req, createSchema);
  const { workspace } = await assertWorkspaceRole(user, body.workspaceId, "editor");
  if (!getTemplate(body.templateId)) throw badRequest(`Unknown template: ${body.templateId}`);
  await enforceRateLimit(`projects:create:${user.id}`, 60, 60 * 60 * 1000);
  await assertProjectQuota(workspace);
  const project = await createProject({
    workspaceId: workspace.id,
    name: body.name,
    description: body.description,
    templateId: body.templateId,
    visibility: body.visibility,
    createdBy: user.id,
  });
  return json({ project: serializeProject(project) }, { status: 201 });
});
