import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { getCurrentSessionId } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { changePassword } from "@/lib/billing/account-service";

const schema = z.object({ currentPassword: z.string().max(256).default(""), newPassword: z.string().min(1, "Enter a new password").max(256) });

/** POST /api/v1/account/password { currentPassword, newPassword } — revokes all other sessions. */
export const POST = handler(async (req) => {
  const user = await requireApiUser();
  await enforceRateLimit(`account:password:${user.id}`, 10, 15 * 60_000);
  const body = await parseBody(req, schema);
  const result = await changePassword(user, body.currentPassword, body.newPassword, await getCurrentSessionId());
  return json({ ok: true, ...result });
});
