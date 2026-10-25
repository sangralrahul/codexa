import { ApiError, handler, json, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { getAllFiles, getSnapshot, logActivity, restoreSnapshot, diffFileSets } from "@/lib/services/projects";
import { getRun } from "@/lib/ai/runs";

type Ctx = { params: Promise<{ id: string; runId: string }> };

/** POST → restores the snapshot taken before the run. Returns the paths that changed back. */
export const POST = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, runId } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  const run = await getRun(id, runId);
  if (!run) throw notFound("Run");
  if (run.status === "running" || run.status === "queued") throw new ApiError(409, "Cancel the run before reverting it", "run_active");
  if (!run.snapshotBeforeId) throw new ApiError(409, "This run did not change any files, so there is nothing to revert", "nothing_to_revert");
  const snap = await getSnapshot(id, run.snapshotBeforeId);
  if (!snap) throw notFound("Snapshot");
  const current = await getAllFiles(id);
  const reverted = diffFileSets(current, snap.files).map((d) => d.path);
  await restoreSnapshot(id, snap.id, user.id);
  await logActivity(id, user.id, "ai.reverted", `Reverted AI run ${runId.slice(0, 8)} (${reverted.length} file(s))`, { runId, snapshotId: snap.id, files: reverted.slice(0, 50) });
  return json({ ok: true, snapshotId: snap.id, revertedPaths: reverted });
});
