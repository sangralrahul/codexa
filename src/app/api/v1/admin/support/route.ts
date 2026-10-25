import { handler, json } from "@/lib/api";
import { q, requireApiAdmin } from "../_lib";
import { listTickets, type TicketStatus } from "@/lib/billing/admin-service";

/** GET /api/v1/admin/support?status=&kind=&page= */
export const GET = handler(async (req) => {
  await requireApiAdmin();
  const s = q(req);
  return json(await listTickets({ status: (s.get("status") as TicketStatus | "all" | undefined) ?? "open", kind: s.get("kind"), page: s.page() }));
});
