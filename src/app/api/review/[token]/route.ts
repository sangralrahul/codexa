import { handler, json, notFound } from "@/lib/api";
import { listPublicComments, resolveFeedbackToken, reviewTarget } from "@/lib/services/feedback";

type Ctx = { params: Promise<{ token: string }> };

/**
 * Public (no Codexa login): GET /api/review/:token → { project: { name }, target, comments }.
 * target is the live site opened in review mode, else a running preview, else { kind: "none" }.
 * Unknown and revoked links are 404.
 */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const { token } = await ctx.params;
  const resolved = await resolveFeedbackToken(token);
  if (!resolved) throw notFound("Review link");
  const [target, comments] = await Promise.all([reviewTarget(resolved.project.id), listPublicComments(resolved.project.id)]);
  return json({ project: { name: resolved.project.name }, target, comments }, { headers: { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
});
