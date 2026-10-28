import { badRequest, handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { listAppUsers } from "@/lib/services/cloud";

type Ctx = { params: Promise<{ id: string }> };

/** GET /cloud/users?cursor=&limit= → the app's users (never password hashes), newest first. */
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "viewer");
  const q = new URL(req.url).searchParams;
  const limit = q.get("limit") ? Number(q.get("limit")) : undefined;
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) throw badRequest("limit must be between 1 and 100");
  return json(await listAppUsers(id, { limit, cursor: q.get("cursor") }));
});
