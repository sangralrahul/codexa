import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { diffFileSets, getAllFiles, getSnapshot, listSnapshots } from "@/lib/services/projects";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Files changed since the latest snapshot: a summary (path + action) without
 * file contents so the workspace header can show a "changed files" indicator.
 */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "viewer");
  const [latest] = await listSnapshots(id, 1);
  if (!latest) return json({ snapshot: null, changes: [] });
  const snap = await getSnapshot(id, latest.id);
  const current = await getAllFiles(id);
  const diff = diffFileSets(snap?.files ?? {}, current);
  return json({
    snapshot: { id: latest.id, name: latest.name, createdAt: latest.createdAt },
    changes: diff.map((d) => ({ path: d.path, action: d.action })),
  });
});
