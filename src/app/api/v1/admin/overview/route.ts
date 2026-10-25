import { handler, json } from "@/lib/api";
import { requireApiAdmin } from "../_lib";
import { overview } from "@/lib/billing/admin-service";
import { queueStats } from "@/lib/jobs";

/** GET /api/v1/admin/overview */
export const GET = handler(async () => {
  await requireApiAdmin();
  const [counts, jobs] = await Promise.all([overview(), queueStats()]);
  return json({ ...counts, jobs });
});
