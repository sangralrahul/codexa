import { z } from "zod";
import { ApiError, handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getRemixSource, remixShowcaseProject } from "@/lib/services/remix";
import { assertProjectQuota } from "@/app/api/v1/projects/_lib/quota";
import { serializeProject } from "@/app/api/v1/projects/_lib/serialize";

type Ctx = { params: Promise<{ slug: string }> };

const schema = z.object({ workspaceId: z.string().trim().min(1).max(64).optional() }).strict();

/**
 * POST /showcase/:slug/remix — copy an approved, public showcase project into a workspace where the
 * caller is at least an editor (body.workspaceId, or the caller's current workspace). Files only;
 * the copy is private. 404 when the entry is unpublished or its project is not public.
 */
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  await enforceRateLimit(`showcase:remix:${user.id}`, 10, 60 * 1000);
  const { slug } = await ctx.params;
  const body = await parseOptionalBody(req);
  const source = await getRemixSource(slug);

  let workspaceId = body.workspaceId;
  if (!workspaceId) {
    const { current } = await getCurrentWorkspace(user);
    if (!current) throw new ApiError(400, "You need a workspace to remix into. Create a workspace first.", "no_workspace");
    workspaceId = current.workspace.id;
  }
  const { workspace } = await assertWorkspaceRole(user, workspaceId, "editor");
  await assertProjectQuota(workspace);

  const project = await remixShowcaseProject({ source, workspaceId: workspace.id, userId: user.id });
  return json({ project: serializeProject(project) }, { status: 201 });
});

/** The body is optional: an empty body means "remix into my current workspace". */
async function parseOptionalBody(req: Request) {
  const text = await req.text();
  if (!text.trim()) return schema.parse({});
  return parseBody(new Request(req.url, { method: "POST", body: text }), schema);
}
