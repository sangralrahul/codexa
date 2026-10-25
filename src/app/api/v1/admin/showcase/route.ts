import { handler, json } from "@/lib/api";
import { q, requireApiAdmin } from "../_lib";
import { listShowcase } from "@/lib/billing/admin-service";

/** GET /api/v1/admin/showcase?filter=pending|approved|all&page= */
export const GET = handler(async (req) => {
  await requireApiAdmin();
  const s = q(req);
  const f = s.get("filter");
  return json(await listShowcase({ filter: f === "approved" || f === "all" ? f : "pending", page: s.page() }));
});
