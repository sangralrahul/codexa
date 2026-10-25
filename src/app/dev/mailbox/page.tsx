import { notFound } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { emailOutbox } from "@/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/misc";
import { Logo } from "@/components/logo";

export const metadata = { title: "Dev mailbox", robots: { index: false, follow: false } };

/**
 * Development-only mailbox. When RESEND_API_KEY is not configured, every email
 * (verification links, password resets, invitations) is stored in email_outbox.
 * This page lets developers open those links. Disabled in production.
 */
export default async function DevMailboxPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const user = await requireUser("/dev/mailbox");
  const rows = await db.select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(50);
  const mine = user.role === "admin" || user.role === "staff" ? rows : rows.filter((r) => r.to.toLowerCase() === user.email.toLowerCase());
  return (
    <div className="container-x py-8">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <Badge variant="warning">Development only</Badge>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Outbox</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Emails are stored here because <code>RESEND_API_KEY</code> is not configured. You see messages addressed to {user.email}
        {user.role !== "user" ? " and, as staff, all messages" : ""}.
      </p>
      {mine.length === 0 ? (
        <Alert className="mt-6">No emails yet.</Alert>
      ) : (
        <ul className="mt-6 space-y-4">
          {mine.map((m) => {
            const links = Array.from(m.html.matchAll(/href="([^"]+)"/g)).map((x) => x[1]);
            return (
              <li key={m.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{m.subject}</div>
                    <div className="text-xs text-muted-foreground">
                      to {m.to} · {m.createdAt.toISOString()} · {m.provider}
                    </div>
                  </div>
                  <Badge variant={m.status === "sent" ? "success" : m.status === "failed" ? "danger" : "default"}>{m.status}</Badge>
                </div>
                {links.length ? (
                  <ul className="mt-3 space-y-1 text-sm">
                    {links.map((l) => (
                      <li key={l}>
                        <a href={l} className="break-all text-primary underline">
                          {l}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-muted-foreground">Plain text</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs">{m.text || "(no text part)"}</pre>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
