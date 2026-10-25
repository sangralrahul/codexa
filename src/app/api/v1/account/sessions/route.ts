import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { getCurrentSessionId } from "@/lib/auth/session";
import { listSessions, revokeOtherSessions } from "@/lib/billing/account-service";

/** GET /api/v1/account/sessions → { sessions } (current one flagged) */
export const GET = handler(async () => {
  const user = await requireApiUser();
  return json({ sessions: await listSessions(user.id, await getCurrentSessionId()) });
});

/** DELETE /api/v1/account/sessions — revoke every session except the current one. */
export const DELETE = handler(async () => {
  const user = await requireApiUser();
  const revoked = await revokeOtherSessions(user.id, await getCurrentSessionId());
  return json({ revoked });
});
