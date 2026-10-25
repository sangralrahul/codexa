import { handler, json } from "@/lib/api";
import { q, requireApiAdmin } from "../_lib";
import { listJobs, queueStats, PAGE } from "./_shared";

/** GET /api/v1/admin/jobs?status=&kind=&page= */
export const GET = handler(async (req) => {
  await requireApiAdmin();
  const s = q(req);
  const status = s.get("status") as "queued" | "running" | "succeeded" | "failed" | "cancelled" | "all" | undefined;
  const page = s.page();
  const [list, stats] = await Promise.all([listJobs({ status: status ?? "all", kind: s.get("kind"), limit: PAGE, offset: (page - 1) * PAGE }), queueStats()]);
  return json({ ...list, stats, page, pageSize: PAGE });
});
