import { handler, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { attachmentKey, getObject } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string; file: string }> };

/** GET /api/v1/projects/:id/attachments/:file → an image attached to an AI prompt (project members only). */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, file } = await ctx.params;
  await assertProjectAccess(user, id, "viewer");
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.test(file)) throw notFound("Attachment");
  const obj = await getObject(attachmentKey(id, file));
  if (!obj) throw notFound("Attachment");
  return new Response(await obj.arrayBuffer(), {
    headers: {
      "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      // File names are random and never reused, so the browser may keep them; private: they are not public.
      "cache-control": "private, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
});
