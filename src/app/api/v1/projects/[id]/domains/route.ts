import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertProjectAccess } from "@/lib/services/access";
import { addDomain, listDomains } from "@/lib/services/publishing";

type Ctx = { params: Promise<{ id: string }> };

/** GET /projects/:id/domains → { domains } */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project, workspace } = await assertProjectAccess(user, id, "viewer");
  return json({ domains: await listDomains(project, workspace) });
});

const schema = z.object({ domain: z.string().min(3).max(253) });

/** POST /projects/:id/domains { domain } → { domain } (owner or admin). */
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project, workspace } = await assertProjectAccess(user, id, "admin");
  const body = await parseBody(req, schema);
  await enforceRateLimit(`domains:${user.id}`, 10, 60_000);
  return json({ domain: await addDomain(project, workspace, user, body.domain) }, { status: 201 });
});
