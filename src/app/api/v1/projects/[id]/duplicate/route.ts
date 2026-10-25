import { z } from "zod";
import { badRequest, handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess, assertWorkspaceRole } from "@/lib/services/access";
import { createProject, getAllFiles, logActivity } from "@/lib/services/projects";
import { getTemplate } from "@/templates";
import { assertProjectQuota } from "../../_lib/quota";
import { serializeProject } from "../../_lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ name: z.string().trim().min(1).max(100).optional() });

/** POST /projects/:id/duplicate — copy a project (files + settings) into the same workspace. */
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "viewer");
  const { workspace } = await assertWorkspaceRole(user, project.workspaceId, "editor");
  const body = await parseOptionalBody(req);
  await assertProjectQuota(workspace);
  // Fall back to the default starter when the original template no longer exists.
  const templateId = project.templateId && getTemplate(project.templateId) ? project.templateId : "vite-react-starter";
  const files = await getAllFiles(id);
  const copy = await createProject({
    workspaceId: workspace.id,
    name: body?.name ?? `${project.name} (copy)`,
    description: project.description,
    templateId,
    visibility: project.visibility,
    createdBy: user.id,
    files,
  });
  await logActivity(copy.id, user.id, "project.duplicated", `Duplicated from "${project.name}"`, { sourceProjectId: id });
  await logActivity(id, user.id, "project.duplicated", `Duplicated as "${copy.name}"`, { targetProjectId: copy.id });
  return json({ project: serializeProject(copy) }, { status: 201 });
});

/** The body is optional: an empty body means "use defaults". */
async function parseOptionalBody(req: Request) {
  const text = await req.text();
  if (!text.trim()) return undefined;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw badRequest("Invalid JSON body");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw badRequest("Validation failed", parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  return parsed.data;
}
