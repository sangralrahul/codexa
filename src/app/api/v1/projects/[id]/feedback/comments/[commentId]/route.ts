import { z } from "zod";
import { handler, json, notFound, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { deleteFeedbackComment, setFeedbackStatus } from "@/lib/services/feedback";

type Ctx = { params: Promise<{ id: string; commentId: string }> };

const schema = z.object({ status: z.enum(["open", "resolved"]) });

/** PATCH { status } → { comment }. */
export const PATCH = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id, commentId } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  const body = await parseBody(req, schema);
  const comment = await setFeedbackStatus(id, commentId, body.status);
  if (!comment) throw notFound("Comment");
  return json({ comment });
});

/** DELETE → 204. */
export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, commentId } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  if (!(await deleteFeedbackComment(id, commentId))) throw notFound("Comment");
  return new Response(null, { status: 204 });
});
