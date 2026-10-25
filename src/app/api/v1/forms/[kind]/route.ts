import { handler, json, parseBody, clientIp, notFound } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { isFormKind, isHoneypotTripped, newsletterSchema, ticketSchema } from "@/components/forms/schemas";
import { createTicket, subscribeNewsletter } from "@/lib/services/support";

const LIMIT = 5;
const WINDOW_MS = 15 * 60 * 1000;

/**
 * POST /api/v1/forms/:kind
 * Public (no auth required). Rate limited 5 submissions / 15 minutes per IP.
 * Honeypot submissions return 200 without persisting so bots learn nothing.
 */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ kind: string }> }) => {
  const { kind } = await ctx.params;
  if (!isFormKind(kind)) throw notFound("Form");

  const ip = clientIp(req);
  await enforceRateLimit(`forms:ip:${ip}`, LIMIT, WINDOW_MS);

  // Peek at the raw body for the honeypot before strict validation.
  const raw: unknown = await req
    .clone()
    .json()
    .catch(() => null);
  if (isHoneypotTripped(raw)) {
    logger.warn("form honeypot tripped", { kind, ip });
    return json({ ok: true });
  }

  const user = await getCurrentUser();

  if (kind === "newsletter") {
    const { email } = await parseBody(req, newsletterSchema);
    const result = await subscribeNewsletter(email);
    return json({ ok: true, alreadySubscribed: result.alreadySubscribed });
  }

  const input = await parseBody(req, ticketSchema);
  const ticket = await createTicket({
    kind,
    userId: user?.id ?? null,
    input,
    ip,
    userAgent: req.headers.get("user-agent"),
  });
  return json({ ok: true, ticketId: ticket.id }, { status: 201 });
});
