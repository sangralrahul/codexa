import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/auth/flows";

export const POST = handler(async () => {
  const user = await requireApiUser();
  if (user.emailVerifiedAt) return json({ ok: true, alreadyVerified: true });
  await enforceRateLimit(`resend-verify:user:${user.id}`, 3, 15 * 60 * 1000);
  await sendVerificationEmail(user.id, user.email);
  return json({ ok: true });
});
