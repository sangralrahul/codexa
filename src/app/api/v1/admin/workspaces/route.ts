import { handler, json } from "@/lib/api";
import { q, requireApiAdmin } from "../_lib";
import { listWorkspacesAdmin } from "@/lib/billing/admin-service";
import type { Plan } from "@/db/schema";

const PLANS = new Set(["free", "pro", "team", "enterprise"]);

/** GET /api/v1/admin/workspaces?q=&plan=&page= */
export const GET = handler(async (req) => {
  await requireApiAdmin();
  const s = q(req);
  const plan = s.get("plan");
  return json(await listWorkspacesAdmin({ q: s.get("q"), page: s.page(), plan: plan && PLANS.has(plan) ? (plan as Plan) : undefined }));
});
