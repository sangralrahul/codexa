import { z } from "zod";
import { clientIp, handler, json, notFound, parseBody } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { addFeedbackComment, resolveFeedbackToken, toPublicComment } from "@/lib/services/feedback";

type Ctx = { params: Promise<{ token: string }> };

const trimmed = (max: number) => z.string().trim().min(1).max(max);

const reviewCommentSchema = z.object({
  authorName: trimmed(60),
  body: trimmed(2000),
  pagePath: z
    .string()
    .max(500)
    .regex(/^\//, "pagePath must start with /")
    .default("/"),
  element: z
    .object({
      path: z.string().min(1).max(600),
      tag: z.string().min(1).max(40),
      text: z.string().max(300).default(""),
      html: z.string().max(900).optional(),
    })
    .nullable()
    .default(null),
});

/** Public (no Codexa login): POST /api/review/:token/comments → { comment } (201). Rate-limited per IP. */
export const POST = handler<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const resolved = await resolveFeedbackToken(token);
  if (!resolved) throw notFound("Review link");
  await enforceRateLimit(`feedback:comment:ip:${clientIp(req)}`, 20, 10 * 60 * 1000);
  const body = await parseBody(req, reviewCommentSchema);
  const comment = await addFeedbackComment(resolved.project.id, resolved.linkId, body);
  return json({ comment: toPublicComment(comment) }, { status: 201 });
});
