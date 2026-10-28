import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertProjectAccess } from "@/lib/services/access";
import { verifyDomain } from "@/lib/services/publishing";

type Ctx = { params: Promise<{ id: string; domainId: string }> };

/** POST /projects/:id/domains/:domainId/verify → { domain } (checks the TXT record over DNS-over-HTTPS). */
export const POST = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, domainId } = await ctx.params;
  const { project, workspace } = await assertProjectAccess(user, id, "admin");
  await enforceRateLimit(`domain-verify:${user.id}`, 20, 60_000);
  return json({ domain: await verifyDomain(project, workspace, user, domainId) });
});
