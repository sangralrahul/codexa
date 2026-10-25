/**
 * Email delivery providers for Codexa's own account emails (verification,
 * password reset, invitations). Kept free of `server-only` so the worker
 * process can import it.
 *
 * Selection: EMAIL_PROVIDER ("customerio" | "resend") if set, otherwise the
 * first configured of Customer.io then Resend. With neither, emails stay in
 * the database outbox.
 */
import { env } from "@/lib/env";

export type EmailProviderId = "customerio" | "resend";
export type OutgoingEmail = { to: string; subject: string; html: string; text?: string };
export type DeliveryResult = { provider: EmailProviderId; providerId: string | null };

const has = (v?: string) => typeof v === "string" && v.trim().length > 0;

export function configuredEmailProviders(): EmailProviderId[] {
  const out: EmailProviderId[] = [];
  if (has(env.CUSTOMERIO_APP_API_KEY)) out.push("customerio");
  if (has(env.RESEND_API_KEY)) out.push("resend");
  return out;
}

export function activeEmailProvider(): EmailProviderId | null {
  const configured = configuredEmailProviders();
  if (env.EMAIL_PROVIDER && configured.includes(env.EMAIL_PROVIDER)) return env.EMAIL_PROVIDER;
  return configured[0] ?? null;
}

export const EMAIL_PROVIDER_NAMES: Record<EmailProviderId, string> = { customerio: "Customer.io", resend: "Resend" };

export function customerIoEndpoint(region: "us" | "eu" = env.CUSTOMERIO_REGION): string {
  return region === "eu" ? "https://api-eu.customer.io/v1/send/email" : "https://api.customer.io/v1/send/email";
}

/** Request body for Customer.io's transactional API, sending our own HTML without a template. */
export function customerIoPayload(msg: OutgoingEmail) {
  return {
    to: msg.to,
    from: env.EMAIL_FROM,
    subject: msg.subject,
    body: msg.html,
    ...(msg.text ? { body_plaintext: msg.text } : {}),
    identifiers: { email: msg.to },
    ...(has(env.CUSTOMERIO_TRANSACTIONAL_MESSAGE_ID) ? { transactional_message_id: env.CUSTOMERIO_TRANSACTIONAL_MESSAGE_ID } : {}),
    // These emails carry one-time sign-in and reset links; do not keep copies in Customer.io's message log.
    disable_message_retention: true,
  };
}

function errorMessage(body: unknown, status: number, provider: string): string {
  const b = body as { message?: string; meta?: { error?: string; errors?: string[] } } | null;
  return b?.message ?? b?.meta?.error ?? b?.meta?.errors?.join("; ") ?? `${provider} error ${status}`;
}

async function sendViaCustomerIo(msg: OutgoingEmail): Promise<DeliveryResult> {
  const res = await fetch(customerIoEndpoint(), {
    method: "POST",
    headers: { Authorization: `Bearer ${env.CUSTOMERIO_APP_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(customerIoPayload(msg)),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => null)) as { delivery_id?: string } | null;
  if (!res.ok) throw new Error(errorMessage(body, res.status, "Customer.io"));
  return { provider: "customerio", providerId: body?.delivery_id ?? null };
}

async function sendViaResend(msg: OutgoingEmail): Promise<DeliveryResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => null)) as { id?: string } | null;
  if (!res.ok) throw new Error(errorMessage(body, res.status, "Resend"));
  return { provider: "resend", providerId: body?.id ?? null };
}

/** Send with the active provider. Throws when none is configured or delivery fails. */
export async function deliverEmail(msg: OutgoingEmail, provider: EmailProviderId | null = activeEmailProvider()): Promise<DeliveryResult> {
  if (provider === "customerio") return sendViaCustomerIo(msg);
  if (provider === "resend") return sendViaResend(msg);
  throw new Error("No email provider is configured (set CUSTOMERIO_APP_API_KEY or RESEND_API_KEY)");
}
