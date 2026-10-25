import { handler, json, ApiError } from "@/lib/api";
import { verifySignature } from "@/lib/crypto";
import { runDueJobs } from "@/lib/jobs/run";

/**
 * POST /api/internal/cron: runs due background jobs. Called by the Worker's
 * cron trigger (worker/index.ts) with an HMAC of "codexa-cron" made with
 * SESSION_SECRET; anything else is rejected.
 */
export const POST = handler(async (req) => {
  const signature = req.headers.get("x-codexa-cron") ?? "";
  if (!signature || !verifySignature("codexa-cron", signature)) throw new ApiError(404, "Not found", "not_found");
  const result = await runDueJobs({ budgetMs: 25_000 });
  return json(result);
});
