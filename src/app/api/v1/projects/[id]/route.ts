import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { logActivity, softDeleteProject, updateProject } from "@/lib/services/projects";
import { serializeProject, serializeWorkspace } from "../_lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project, workspace, role } = await assertProjectAccess(user, id, "viewer");
  return json({ project: serializeProject(project), role, workspace: serializeWorkspace(workspace) });
});

const settingsSchema = z
  .object({
    devCommand: z.string().trim().max(200).optional(),
    buildCommand: z.string().trim().max(200).optional(),
    installCommand: z.string().trim().max(200).optional(),
    outputDir: z.string().trim().max(100).optional(),
    port: z.number().int().min(1).max(65535).optional(),
    nodeVersion: z.string().trim().max(20).optional(),
    knowledge: z.string().trim().max(4000, "Knowledge is limited to 4,000 characters").optional(),
  })
  .strict();

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).optional(),
    visibility: z.enum(["private", "unlisted", "public"]).optional(),
    settings: settingsSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const PATCH = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "editor");
  const body = await parseBody(req, patchSchema);
  const patch: Parameters<typeof updateProject>[1] = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.description !== undefined) patch.description = body.description;
  if (body.visibility !== undefined) patch.visibility = body.visibility;
  if (body.settings !== undefined) patch.settings = { ...project.settings, ...body.settings };
  const updated = await updateProject(id, patch);
  const changed = Object.keys(body);
  await logActivity(id, user.id, "project.updated", `Updated ${changed.join(", ")}`, {
    changed,
    ...(body.name && body.name !== project.name ? { from: project.name, to: body.name } : {}),
  });
  return json({ project: serializeProject(updated) });
});

export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "admin");
  await logActivity(id, user.id, "project.deleted", `Deleted project "${project.name}"`);
  await softDeleteProject(id);
  return new Response(null, { status: 204 });
});
