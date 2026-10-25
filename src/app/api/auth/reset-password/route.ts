import { z } from "zod";
import { handler, json, parseBody, badRequest, clientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resetPassword, validatePassword } from "@/lib/auth/flows";

export const POST = handler(async (req) => {
  await enforceRateLimit(`reset:ip:${clientIp(req)}`, 10, 15 * 60 * 1000);
  const body = await parseBody(req, z.object({ token: z.string().min(10), password: z.string().min(1).max(256) }));
  const pwError = validatePassword(body.password);
  if (pwError) throw badRequest(pwError, [{ path: "password", message: pwError }]);
  await resetPassword(body.token, body.password);
  return json({ ok: true });
});
