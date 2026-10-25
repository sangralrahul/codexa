import { handler, json } from "@/lib/api";
import { clearSessionCookie, getCurrentSessionId, invalidateSession } from "@/lib/auth/session";

export const POST = handler(async () => {
  const sid = await getCurrentSessionId();
  if (sid) await invalidateSession(sid);
  await clearSessionCookie();
  return json({ ok: true });
});
