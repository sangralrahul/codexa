import { z } from "zod";
import { clientIp, handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { clearSessionCookie } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { deleteAccount } from "@/lib/billing/account-service";

const schema = z.object({ password: z.string().min(1, "Confirm with your password").max(256) });

/** POST /api/v1/account/delete { password } — soft-delete + anonymise, then sign out. */
export const POST = handler(async (req) => {
  const user = await requireApiUser();
  await enforceRateLimit(`account:delete:${user.id}`, 5, 15 * 60_000);
  const body = await parseBody(req, schema);
  const result = await deleteAccount(user, body.password, clientIp(req));
  await clearSessionCookie();
  return json({ ok: true, ...result, next: "/" });
});
