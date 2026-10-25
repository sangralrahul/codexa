import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { createShareLink, listShareLinks } from "@/lib/services/share-links";
import { logActivity } from "@/lib/services/projects";
import { enforceRateLimit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

/** Active share links. Tokens are never returned after creation (only hashes are stored). */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  const links = await listShareLinks(id);
  return json({ links });
});

const schema = z.object({
  access: z.enum(["view", "edit"]).default("view"),
  expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
});

export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  const body = await parseBody(req, schema);
  await enforceRateLimit(`share:create:${id}`, 30, 60 * 60 * 1000);
  const { link, url } = await createShareLink({ projectId: id, access: body.access, expiresInDays: body.expiresInDays ?? null, createdBy: user.id });
  await logActivity(id, user.id, "share.created", `Created a ${body.access} share link`, { linkId: link.id, access: body.access });
  return json({ url, link }, { status: 201 });
});
