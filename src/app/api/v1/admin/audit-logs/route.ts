import { handler, json } from "@/lib/api";
import { q, requireApiAdmin } from "../_lib";
import { listAuditLogs } from "@/lib/billing/admin-service";

/** GET /api/v1/admin/audit-logs?action=&workspaceId=&actorId=&page= */
export const GET = handler(async (req) => {
  await requireApiAdmin();
  const s = q(req);
  return json(await listAuditLogs({ action: s.get("action"), workspaceId: s.get("workspaceId"), actorId: s.get("actorId"), page: s.page() }));
});
