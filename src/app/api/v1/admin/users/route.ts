import { handler, json } from "@/lib/api";
import { q, requireApiAdmin } from "../_lib";
import { listUsers } from "@/lib/billing/admin-service";

/** GET /api/v1/admin/users?q=&role=&page= */
export const GET = handler(async (req) => {
  await requireApiAdmin();
  const s = q(req);
  const role = s.get("role");
  return json(await listUsers({ q: s.get("q"), page: s.page(), role: role === "user" || role === "staff" || role === "admin" ? role : undefined }));
});
