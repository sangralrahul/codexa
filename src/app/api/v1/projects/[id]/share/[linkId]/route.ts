import { handler, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { revokeShareLink } from "@/lib/services/share-links";
import { logActivity } from "@/lib/services/projects";

type Ctx = { params: Promise<{ id: string; linkId: string }> };

export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, linkId } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  const ok = await revokeShareLink(id, linkId);
  if (!ok) throw notFound("Share link");
  await logActivity(id, user.id, "share.revoked", "Revoked a share link", { linkId });
  return new Response(null, { status: 204 });
});
