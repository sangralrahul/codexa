import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { updateWorkspaceSettings } from "@/lib/billing/service";
import { serializeWorkspace } from "@/app/api/v1/projects/_lib/serialize";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60).optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Slug is too short")
    .max(48)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Use lowercase letters, numbers and hyphens")
    .optional(),
  billingCurrency: z.enum(["USD", "INR"]).optional(),
});

/**
 * PATCH /api/v1/workspaces/:id/billing/settings { name?, slug?, billingCurrency? }
 * Workspace general settings (name/slug/currency). Lives under billing because the
 * generic PATCH /workspaces/:id belongs to the workspace API owner.
 */
export const PATCH = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertWorkspaceRole(user, id, "admin");
  const body = await parseBody(req, schema);
  const ws = await updateWorkspaceSettings(id, user.id, body);
  return json({ workspace: serializeWorkspace(ws) });
});
