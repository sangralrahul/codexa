import { z } from "zod";
import { handler, json, parseBody, badRequest } from "@/lib/api";
import { verifyEmailToken } from "@/lib/auth/flows";
import { toSafeUser } from "@/lib/auth/session";

export const POST = handler(async (req) => {
  const { token } = await parseBody(req, z.object({ token: z.string().min(10) }));
  const user = await verifyEmailToken(token);
  if (!user) throw badRequest("This verification link is invalid or has expired");
  return json({ ok: true, user: toSafeUser(user) });
});
