import { handler, json, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { diffFileSets, getAllFiles, getSnapshot, type FileDiff } from "@/lib/services/projects";
import { getRun } from "@/lib/ai/runs";
import { lineDelta } from "@/lib/ai/tools/edit";

type Ctx = { params: Promise<{ id: string; runId: string }> };

const MAX_DIFF_CONTENT = 200_000;

/** GET → { run, diff: FileDiff[] (vs snapshotBefore), stats: { path, added, removed }[] } */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, runId } = await ctx.params;
  await assertProjectAccess(user, id, "viewer");
  const run = await getRun(id, runId);
  if (!run) throw notFound("Run");
  let diff: FileDiff[] = [];
  let snapshotBefore: { id: string; name: string; createdAt: Date } | null = null;
  if (run.snapshotBeforeId) {
    const snap = await getSnapshot(id, run.snapshotBeforeId);
    if (snap) {
      snapshotBefore = { id: snap.id, name: snap.name, createdAt: snap.createdAt };
      const current = await getAllFiles(id);
      diff = diffFileSets(snap.files, current).map((d) => ({
        ...d,
        before: d.before && d.before.length > MAX_DIFF_CONTENT ? d.before.slice(0, MAX_DIFF_CONTENT) : d.before,
        after: d.after && d.after.length > MAX_DIFF_CONTENT ? d.after.slice(0, MAX_DIFF_CONTENT) : d.after,
      }));
    }
  }
  const stats = diff.map((d) => ({ path: d.path, action: d.action, ...lineDelta(d.before, d.after) }));
  return json({ run, diff, stats, snapshotBefore });
});
