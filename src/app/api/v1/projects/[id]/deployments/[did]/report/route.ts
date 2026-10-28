import { handler, json, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertProjectAccess } from "@/lib/services/access";
import { getDeploymentReport } from "@/lib/services/publish-report";

type Ctx = { params: Promise<{ id: string; did: string }> };

/** GET /projects/:id/deployments/:did/report → speed & SEO report measured on the published files. */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, did } = await ctx.params;
  await assertProjectAccess(user, id, "viewer");
  await enforceRateLimit(`report:user:${user.id}`, 30, 60_000);
  const report = await getDeploymentReport(id, did);
  if (!report) throw notFound("Report (only published Codexa-hosted versions have one)");
  return json(report);
});
