import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertProjectAccess } from "@/lib/services/access";
import { getAllFiles } from "@/lib/services/projects";
import { scanProject } from "@/lib/services/site-checks";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/v1/projects/:id/checks → pre-publish security and quality scan of the current files. */
export const POST = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "viewer");
  await enforceRateLimit(`checks:user:${user.id}`, 30, 60_000);
  return json({ report: scanProject(await getAllFiles(id)) });
});
