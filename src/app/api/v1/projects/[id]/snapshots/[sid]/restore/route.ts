import { handler, json, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { getSnapshot, restoreSnapshot } from "@/lib/services/projects";

type Ctx = { params: Promise<{ id: string; sid: string }> };

export const POST = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, sid } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  const snap = await getSnapshot(id, sid);
  if (!snap) throw notFound("Snapshot");
  const restored = await restoreSnapshot(id, sid, user.id);
  return json({ restored: { id: restored.id, name: restored.name }, paths: Object.keys(restored.files) });
});
