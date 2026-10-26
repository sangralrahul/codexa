import "server-only";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { emailOutbox } from "@/db/schema";
import { env } from "@/lib/env";
import { activeEmailProvider, EMAIL_PROVIDER_NAMES } from "./providers";

/** What the email setup looks like, without exposing any key. */
export function emailSettings() {
  const provider = activeEmailProvider();
  const from = env.EMAIL_FROM;
  const fromDomain = from.match(/@([^>\s]+)/)?.[1] ?? null;
  return {
    provider,
    providerName: provider ? EMAIL_PROVIDER_NAMES[provider] : null,
    region: provider === "customerio" ? env.CUSTOMERIO_REGION : null,
    from,
    fromDomain,
    usesTemplate: Boolean(env.CUSTOMERIO_TRANSACTIONAL_MESSAGE_ID?.trim()),
  };
}

/** Latest outbox rows, metadata only: bodies hold one-time sign-in and reset links and are never shown. */
export async function recentEmails(limit = 25) {
  return db
    .select({ id: emailOutbox.id, to: emailOutbox.to, subject: emailOutbox.subject, status: emailOutbox.status, provider: emailOutbox.provider, error: emailOutbox.error, createdAt: emailOutbox.createdAt, sentAt: emailOutbox.sentAt })
    .from(emailOutbox)
    .orderBy(desc(emailOutbox.createdAt))
    .limit(limit);
}

/** Plain-language next step for the delivery errors operators hit most often. */
export function explainEmailError(error: string | null | undefined): string | null {
  if (!error) return null;
  const e = error.toLowerCase();
  if (/unauthori[sz]ed|401|forbidden|403|invalid (api )?key|authentication/.test(e))
    return "Customer.io rejected the key. Use an App API key (Customer.io → Settings → API Credentials → App API Keys, not a Track key), and check that CUSTOMERIO_REGION (us or eu) matches your account's region.";
  if (/domain|sender|from address|from field|not verified|unverified|spf|dkim/.test(e))
    return `The sender address isn't allowed yet. In Customer.io open Settings → Workspace Settings → Email → Sending domains, add ${emailSettings().fromDomain ?? "your domain"}, then add the DNS records it shows in Cloudflare (DNS → Records) and click Verify.`;
  if (/identifier|to address|recipient|invalid email/.test(e)) return "The recipient address was rejected. Check the email address is valid.";
  if (/timeout|timed out|network|fetch failed|econn/.test(e)) return "Codexa could not reach Customer.io (network or timeout). Try again in a minute.";
  if (/transactional_message|message id|template/.test(e)) return "CUSTOMERIO_TRANSACTIONAL_MESSAGE_ID points at a message Customer.io can't find. Remove that setting to send Codexa's own email design, or fix the id.";
  return null;
}
