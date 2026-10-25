import { handler, json } from "@/lib/api";
import { requireApiAdmin } from "../_lib";
import { aiHealth } from "@/lib/billing/admin-service";

/** GET /api/v1/admin/ai-health */
export const GET = handler(async () => {
  await requireApiAdmin();
  return json(await aiHealth());
});
