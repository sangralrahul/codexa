import { handler, json } from "@/lib/api";
import { q, requireApiAdmin } from "../_lib";
import { listSubscriptionsAdmin } from "@/lib/billing/admin-service";

/** GET /api/v1/admin/subscriptions?status=&page= */
export const GET = handler(async (req) => {
  await requireApiAdmin();
  const s = q(req);
  return json(await listSubscriptionsAdmin({ status: s.get("status"), page: s.page() }));
});
