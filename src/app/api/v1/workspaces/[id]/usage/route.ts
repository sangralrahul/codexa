import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { getWorkspaceEntitlements } from "@/lib/services/usage";
import { countProjects } from "@/lib/services/projects";
import { listMembers } from "@/lib/services/workspaces";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/v1/workspaces/:id/usage → { plan, limits, used, remaining, periodStart, counts } */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { workspace } = await assertWorkspaceRole(user, id, "viewer");
  const [ent, projectCount, members] = await Promise.all([getWorkspaceEntitlements(workspace), countProjects(id), listMembers(id)]);
  return json({
    plan: ent.plan,
    limits: ent.limits,
    used: ent.used,
    remaining: ent.remaining,
    periodStart: ent.periodStart.toISOString(),
    counts: { projects: projectCount, members: members.length },
  });
});
