import { handler, json } from "@/lib/api";
import { q, requireApiAdmin } from "../_lib";
import { listAbuse, type TicketStatus } from "@/lib/billing/admin-service";

/** GET /api/v1/admin/abuse?status=&page= */
export const GET = handler(async (req) => {
  await requireApiAdmin();
  const s = q(req);
  return json(await listAbuse({ status: (s.get("status") as TicketStatus | "all" | undefined) ?? "open", page: s.page() }));
});
