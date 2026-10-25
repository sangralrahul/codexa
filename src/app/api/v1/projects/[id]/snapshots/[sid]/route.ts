import { handler, json, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { diffFileSets, getAllFiles, getSnapshot } from "@/lib/services/projects";

type Ctx = { params: Promise<{ id: string; sid: string }> };

/** Snapshot detail with the diff from the snapshot to the current files (before = snapshot, after = current). */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, sid } = await ctx.params;
  await assertProjectAccess(user, id, "viewer");
  const snap = await getSnapshot(id, sid);
  if (!snap) throw notFound("Snapshot");
  const current = await getAllFiles(id);
  const diff = diffFileSets(snap.files, current);
  return json({
    snapshot: {
      id: snap.id,
      name: snap.name,
      kind: snap.kind,
      message: snap.message,
      createdBy: snap.createdBy,
      createdAt: snap.createdAt,
      fileCount: Object.keys(snap.files).length,
    },
    diff,
  });
});
