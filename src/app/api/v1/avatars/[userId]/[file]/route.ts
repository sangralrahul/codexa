import { handler, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { avatarKey, getObject } from "@/lib/storage";

const USER_ID = /^[0-9a-f-]{36}$/;
const FILE = /^[0-9a-f-]{36}\.(png|jpg|gif|webp)$/;

/**
 * GET /api/v1/avatars/:userId/:file → the uploaded profile photo. Signed-in users only
 * (photos appear next to names inside the app). File names are random per upload, so the
 * response can be cached for a long time.
 */
export const GET = handler(async (_req, ctx: { params: Promise<{ userId: string; file: string }> }) => {
  await requireApiUser();
  const { userId, file } = await ctx.params;
  if (!USER_ID.test(userId) || !FILE.test(file)) throw notFound("Image");
  const obj = await getObject(avatarKey(userId, file));
  if (!obj) throw notFound("Image");
  return new Response(await obj.arrayBuffer(), {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
});
