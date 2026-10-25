import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { newsletterSubscribers, supportTickets, type SupportTicket } from "@/db/schema";
import { logger } from "@/lib/logger";
import type { TicketInput, TicketKind } from "@/components/forms/schemas";

export type CreateTicketInput = {
  kind: TicketKind;
  userId?: string | null;
  input: TicketInput;
  ip?: string | null;
  userAgent?: string | null;
};

/** Persist a public form submission as a support ticket. Metadata never includes secrets. */
export async function createTicket({ kind, userId, input, ip, userAgent }: CreateTicketInput): Promise<SupportTicket> {
  const metadata: Record<string, unknown> = {
    source: "website",
    ip: ip ?? null,
    userAgent: userAgent?.slice(0, 300) ?? null,
  };
  if (input.company) metadata.company = input.company;
  if (input.topic) metadata.topic = input.topic;
  if (input.pageUrl) metadata.pageUrl = input.pageUrl;
  if (input.severity) metadata.severity = input.severity;

  const [ticket] = await db
    .insert(supportTickets)
    .values({
      userId: userId ?? null,
      email: input.email.toLowerCase(),
      name: input.name ?? "",
      kind,
      subject: input.subject,
      body: input.message,
      metadata,
    })
    .returning();
  logger.info("support ticket created", { kind, ticketId: ticket.id, hasUser: Boolean(userId) });
  return ticket;
}

/** Upsert a newsletter subscriber; re-subscribing clears an earlier unsubscribe. */
export async function subscribeNewsletter(email: string): Promise<{ id: string; alreadySubscribed: boolean }> {
  const normalized = email.trim().toLowerCase();
  const existing = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, normalized)).limit(1);
  if (existing[0]) {
    const row = existing[0];
    if (row.unsubscribedAt) {
      await db.update(newsletterSubscribers).set({ unsubscribedAt: null }).where(eq(newsletterSubscribers.id, row.id));
      return { id: row.id, alreadySubscribed: false };
    }
    return { id: row.id, alreadySubscribed: true };
  }
  const [row] = await db
    .insert(newsletterSubscribers)
    .values({ email: normalized })
    .onConflictDoUpdate({ target: newsletterSubscribers.email, set: { unsubscribedAt: sql`null` } })
    .returning();
  return { id: row.id, alreadySubscribed: false };
}

export async function getTicketById(id: string): Promise<SupportTicket | null> {
  const rows = await db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1);
  return rows[0] ?? null;
}
