import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { listActivity } from "@/lib/services/projects";
import { listMembers } from "@/lib/services/workspaces";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "viewer");
  const limit = Math.min(200, Math.max(1, Number(new URL(req.url).searchParams.get("limit") ?? 50) || 50));
  const [rows, members] = await Promise.all([listActivity(id, limit), listMembers(project.workspaceId)]);
  const names = new Map(members.map((m) => [m.userId, m.name || m.email]));
  const activity = rows.map((a) => ({
    id: a.id,
    kind: a.kind,
    message: a.message,
    metadata: a.metadata,
    actorId: a.actorId,
    actorName: a.actorId ? (names.get(a.actorId) ?? "Former member") : "System",
    createdAt: a.createdAt,
  }));
  return json({ activity });
});
