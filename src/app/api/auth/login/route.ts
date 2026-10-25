import { z } from "zod";
import { handler, json, parseBody, clientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { signIn } from "@/lib/auth/flows";
import { createSession, setSessionCookie, toSafeUser } from "@/lib/auth/session";

const schema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(256) });

export const POST = handler(async (req) => {
  const ip = clientIp(req);
  const body = await parseBody(req, schema);
  await enforceRateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
  await enforceRateLimit(`login:email:${body.email.toLowerCase()}`, 10, 15 * 60 * 1000);
  const user = await signIn({ ...body, ip });
  const { token, expiresAt } = await createSession(user.id, { ip, userAgent: req.headers.get("user-agent") });
  await setSessionCookie(token, expiresAt);
  return json({ user: toSafeUser(user), next: user.onboardedAt ? "/dashboard" : "/onboarding" });
});
