import { z } from "zod";
import { handler, json, parseBody, clientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { signUp, validatePassword } from "@/lib/auth/flows";
import { createSession, setSessionCookie, toSafeUser } from "@/lib/auth/session";
import { badRequest } from "@/lib/api";

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
  name: z.string().max(100).optional(),
});

export const POST = handler(async (req) => {
  const ip = clientIp(req);
  await enforceRateLimit(`signup:ip:${ip}`, 10, 60 * 60 * 1000);
  const body = await parseBody(req, schema);
  const pwError = validatePassword(body.password);
  if (pwError) throw badRequest(pwError, [{ path: "password", message: pwError }]);
  const { user } = await signUp({ ...body, ip });
  const { token, expiresAt } = await createSession(user.id, { ip, userAgent: req.headers.get("user-agent") });
  await setSessionCookie(token, expiresAt);
  return json({ user: toSafeUser(user), next: "/onboarding" }, { status: 201 });
});
