import { z } from "zod";
import { handler, json, parseBody, clientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requestPasswordReset } from "@/lib/auth/flows";

export const POST = handler(async (req) => {
  await enforceRateLimit(`forgot:ip:${clientIp(req)}`, 5, 15 * 60 * 1000);
  const { email } = await parseBody(req, z.object({ email: z.string().email().max(254) }));
  await requestPasswordReset(email);
  return json({ ok: true, message: "If an account exists for that email, a reset link has been sent." });
});
