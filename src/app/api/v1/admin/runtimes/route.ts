import { handler, json } from "@/lib/api";
import { requireApiAdmin } from "../_lib";
import { activeRuntimes } from "@/lib/billing/admin-service";

/** GET /api/v1/admin/runtimes — active runtime_sessions */
export const GET = handler(async () => {
  await requireApiAdmin();
  return json({ runtimes: await activeRuntimes() });
});
