import { z } from "zod";
import { badRequest, handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { COLLECTION_ACCESS, adminListRecords, setCollectionAccess } from "@/lib/services/cloud";
import { logActivity } from "@/lib/services/projects";

type Ctx = { params: Promise<{ id: string; name: string }> };

/** GET /cloud/collections/:name?cursor=&limit= → records, newest first (no access rules: project members only). */
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id, name } = await ctx.params;
  await assertProjectAccess(user, id, "viewer");
  const q = new URL(req.url).searchParams;
  const limit = q.get("limit") ? Number(q.get("limit")) : undefined;
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) throw badRequest("limit must be between 1 and 100");
  return json(await adminListRecords(id, name, { limit, cursor: q.get("cursor") }));
});

const patchSchema = z.object({ access: z.enum(COLLECTION_ACCESS) });

/** PATCH /cloud/collections/:name { access } → change who can read/write (creates the collection if needed). */
export const PATCH = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id, name } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  const { access } = await parseBody(req, patchSchema);
  const result = await setCollectionAccess(id, name, access);
  await logActivity(id, user.id, "cloud.collection", `${result.created ? "Created" : "Updated"} Cloud collection ${name} (${access})`, { name, access });
  return json({ collection: result });
});
