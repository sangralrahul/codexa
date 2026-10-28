import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertProjectAccess } from "@/lib/services/access";
import { getAnalytics, getPublishing, listDomains, setSiteName } from "@/lib/services/publishing";

type Ctx = { params: Promise<{ id: string }> };

/** GET /projects/:id/publishing → { publishing, domains, analytics } */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project, workspace, role } = await assertProjectAccess(user, id, "viewer");
  const [publishing, domains, analytics] = await Promise.all([getPublishing(project, workspace), listDomains(project, workspace), getAnalytics(project.id, 30)]);
  return json({ publishing, domains, analytics, canManage: role === "owner" || role === "admin" });
});

const schema = z.object({ siteName: z.string().min(1).max(63) });

/** PATCH /projects/:id/publishing { siteName } → { publishing } (owner or admin: it changes the public address). */
export const PATCH = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project, workspace } = await assertProjectAccess(user, id, "admin");
  const body = await parseBody(req, schema);
  await enforceRateLimit(`site-name:${user.id}`, 10, 60_000);
  return json({ publishing: await setSiteName(project, workspace, user, body.siteName) });
});
