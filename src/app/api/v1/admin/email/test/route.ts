import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiAdmin } from "../../_lib";
import { enforceRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { explainEmailError } from "@/lib/email/diagnostics";

const schema = z.object({ to: z.string().trim().email("Enter a valid email address").max(254).optional() });

/** POST /api/v1/admin/email/test { to? } → { ok, provider, error?, hint? }: sends one test email and reports the provider's answer. */
export const POST = handler(async (req) => {
  const actor = await requireApiAdmin();
  await enforceRateLimit(`admin:email-test:${actor.id}`, 10, 60 * 60_000);
  const { to = actor.email } = await parseBody(req, schema);
  await audit({ actorId: actor.id, action: "admin.email_test", metadata: { to } });
  try {
    const res = await sendEmail({
      to,
      subject: "Codexa test email",
      html: `<p>This is a test email from your Codexa admin area. If you can read it, email delivery works.</p>`,
      text: "This is a test email from your Codexa admin area. If you can read it, email delivery works.",
    });
    return json({ ok: res.provider !== "outbox", provider: res.provider, error: res.provider === "outbox" ? "No email provider is configured, so the message was only stored in the outbox." : undefined });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return json({ ok: false, provider: null, error, hint: explainEmailError(error) });
  }
});
