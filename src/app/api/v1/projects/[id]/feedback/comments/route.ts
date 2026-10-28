import { z } from "zod";
import { badRequest, handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { countOpenComments, listFeedbackComments } from "@/lib/services/feedback";

type Ctx = { params: Promise<{ id: string }> };

const statusSchema = z.enum(["open", "resolved"]).optional();

/** GET ?status=open|resolved → { comments (newest first), openCount }. */
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "viewer");
  const parsed = statusSchema.safeParse(new URL(req.url).searchParams.get("status") || undefined);
  if (!parsed.success) throw badRequest("status must be open or resolved");
  const [comments, openCount] = await Promise.all([listFeedbackComments(id, { status: parsed.data }), countOpenComments(id)]);
  return json({ comments, openCount });
});
