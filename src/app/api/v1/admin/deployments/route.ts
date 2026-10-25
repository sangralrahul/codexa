import { handler, json } from "@/lib/api";
import { q, requireApiAdmin } from "../_lib";
import { recentDeployments } from "@/lib/billing/admin-service";

/** GET /api/v1/admin/deployments?status=failed&page= */
export const GET = handler(async (req) => {
  await requireApiAdmin();
  const s = q(req);
  return json(await recentDeployments({ status: s.get("status") ?? "failed", page: s.page() }));
});
