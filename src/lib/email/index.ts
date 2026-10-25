import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailOutbox } from "@/db/schema";
import { env, capabilities } from "@/lib/env";
import { logger } from "@/lib/logger";

export type EmailMessage = { to: string; subject: string; html: string; text?: string };

/**
 * Email transport. With RESEND_API_KEY set, messages are sent through Resend.
 * Otherwise they are persisted to the email_outbox table (status "queued",
 * provider "outbox") and viewable at /dev/mailbox in development. This keeps
 * the auth flows fully functional without external credentials and makes the
 * missing configuration explicit instead of silently failing.
 */
export async function sendEmail(msg: EmailMessage): Promise<{ id: string; provider: string }> {
  const [row] = await db
    .insert(emailOutbox)
    .values({ to: msg.to, subject: msg.subject, html: msg.html, text: msg.text ?? "", provider: capabilities.email ? "resend" : "outbox" })
    .returning({ id: emailOutbox.id });

  if (!capabilities.email) {
    logger.info("email queued to outbox (RESEND_API_KEY not configured)", { to: msg.to, subject: msg.subject });
    return { id: row.id, provider: "outbox" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) throw new Error(body.message ?? `Resend error ${res.status}`);
    await db.update(emailOutbox).set({ status: "sent", providerId: body.id ?? null, sentAt: new Date() }).where(eq(emailOutbox.id, row.id));
    return { id: row.id, provider: "resend" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(emailOutbox).set({ status: "failed", error: message }).where(eq(emailOutbox.id, row.id));
    logger.error("email send failed", { error: message });
    throw err;
  }
}

function layout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0b0c0f">
  <div style="max-width:520px;margin:32px auto;background:#fff;border:1px solid #e3e6eb;border-radius:12px;padding:32px">
    <div style="font-weight:700;letter-spacing:.18em;font-size:13px;margin-bottom:24px">CODEXA</div>
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    ${bodyHtml}
    <p style="font-size:12px;color:#5b6270;margin-top:32px">If you did not request this, you can safely ignore this email.</p>
  </div></body></html>`;
}

export const emails = {
  verifyEmail(to: string, url: string) {
    return sendEmail({
      to,
      subject: "Verify your email for Codexa",
      html: layout("Verify your email", `<p>Confirm your email address to finish setting up your Codexa account.</p><p><a href="${url}" style="display:inline-block;background:#2f6bff;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">Verify email</a></p><p style="font-size:12px;color:#5b6270">Or paste this link: ${url}</p>`),
      text: `Verify your email: ${url}`,
    });
  },
  resetPassword(to: string, url: string) {
    return sendEmail({
      to,
      subject: "Reset your Codexa password",
      html: layout("Reset your password", `<p>Use the link below to choose a new password. It expires in one hour.</p><p><a href="${url}" style="display:inline-block;background:#2f6bff;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">Reset password</a></p><p style="font-size:12px;color:#5b6270">Or paste this link: ${url}</p>`),
      text: `Reset your password: ${url}`,
    });
  },
  workspaceInvite(to: string, workspaceName: string, inviterName: string, url: string) {
    return sendEmail({
      to,
      subject: `${inviterName} invited you to ${workspaceName} on Codexa`,
      html: layout(`You're invited to ${workspaceName}`, `<p>${inviterName} invited you to collaborate in <strong>${workspaceName}</strong>.</p><p><a href="${url}" style="display:inline-block;background:#2f6bff;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">Accept invitation</a></p>`),
      text: `Accept your invitation: ${url}`,
    });
  },
};
