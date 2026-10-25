import { z } from "zod";
import { clientIp, handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { getTeam, inviteMember } from "@/lib/billing/team-service";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254), role: z.enum(["owner", "admin", "editor", "viewer"]).default("editor") });

/** GET /api/v1/workspaces/:id/invites → { invites } (pending) */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertWorkspaceRole(user, id, "admin");
  return json({ invites: (await getTeam(id)).invites });
});

/** POST /api/v1/workspaces/:id/invites { email, role } → { invite, emailStatus } */
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { workspace, role } = await assertWorkspaceRole(user, id, "admin");
  const body = await parseBody(req, schema);
  const result = await inviteMember({ workspace, actor: user, actorRole: role, email: body.email, role: body.role, ip: clientIp(req) });
  return json(result, { status: 201 });
});
