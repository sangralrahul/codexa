import { handler, json, notFound } from "@/lib/api";
import { requireApiAdmin } from "../../../_lib";
import { retryJob } from "../../_shared";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/v1/admin/jobs/:id/retry — re-queue a failed/cancelled job. */
export const POST = handler<Ctx>(async (_req, ctx) => {
  const actor = await requireApiAdmin();
  const { id } = await ctx.params;
  const job = await retryJob(id);
  if (!job) throw notFound("Failed job");
  await audit({ actorId: actor.id, action: "admin.job_retried", targetType: "job", targetId: id, metadata: { kind: job.kind } });
  return json({ job });
});
