import { badRequest, handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { getCurrentSessionId } from "@/lib/auth/session";
import { revokeSession } from "@/lib/billing/account-service";

type Ctx = { params: Promise<{ sid: string }> };

/** DELETE /api/v1/account/sessions/:sid — revoke one session (not the current one; use logout for that). */
export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { sid } = await ctx.params;
  if (sid === (await getCurrentSessionId())) throw badRequest("Use Sign out to end the current session");
  await revokeSession(user.id, sid);
  return json({ ok: true });
});
