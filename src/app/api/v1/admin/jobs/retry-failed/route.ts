import { handler, json } from "@/lib/api";
import { requireApiAdmin } from "../../_lib";
import { retryAllFailed } from "../_shared";
import { audit } from "@/lib/audit";

/** POST /api/v1/admin/jobs/retry-failed → { retried } */
export const POST = handler(async () => {
  const actor = await requireApiAdmin();
  const retried = await retryAllFailed();
  await audit({ actorId: actor.id, action: "admin.jobs_retried", metadata: { retried } });
  return json({ retried });
});
