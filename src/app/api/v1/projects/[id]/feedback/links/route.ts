import { handler, json, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertProjectAccess } from "@/lib/services/access";
import { createFeedbackLink, getFeedbackLinkStatus, revokeFeedbackLink } from "@/lib/services/feedback";
import { logActivity } from "@/lib/services/projects";

type Ctx = { params: Promise<{ id: string }> };

/** GET → { link: { id, createdAt } | null }. The token itself is never returned after creation. */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  const status = await getFeedbackLinkStatus(id);
  return json({ link: status.active });
});

/** POST → { url, link } (201). Replaces (revokes) the project's previous review link. */
export const POST = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  await enforceRateLimit(`feedback:link:${id}`, 30, 60 * 60 * 1000);
  const { link, url } = await createFeedbackLink(id, user.id);
  await logActivity(id, user.id, "feedback.link_created", "Created a client review link", { linkId: link.id });
  return json({ url, link }, { status: 201 });
});

/** DELETE → 204. Revokes the active review link; anyone holding it then gets a 404. */
export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  if (!(await revokeFeedbackLink(id))) throw notFound("Review link");
  await logActivity(id, user.id, "feedback.link_revoked", "Revoked the client review link");
  return new Response(null, { status: 204 });
});
