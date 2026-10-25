import { afterAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { newsletterSubscribers, supportTickets } from "@/db/schema";
import { createTicket, getTicketById, subscribeNewsletter } from "@/lib/services/support";
import { ticketSchema } from "@/components/forms/schemas";

const suffix = Date.now().toString(36);
const emails = [`bug-${suffix}@example.com`, `sales-${suffix}@example.com`, `news-${suffix}@example.com`];

afterAll(async () => {
  await db.delete(supportTickets).where(inArray(supportTickets.email, emails));
  await db.delete(newsletterSubscribers).where(inArray(newsletterSubscribers.email, emails));
});

describe("support tickets", () => {
  it("persists a bug report with metadata and no user", async () => {
    const input = ticketSchema.parse({ name: "Tester", email: emails[0].toUpperCase(), subject: "Preview fails", message: "Clicking Run does nothing on Express projects.", pageUrl: "/report-bug", severity: "high" });
    const ticket = await createTicket({ kind: "bug", input, ip: "203.0.113.9", userAgent: "vitest" });
    expect(ticket.id).toBeTruthy();
    expect(ticket.kind).toBe("bug");
    expect(ticket.email).toBe(emails[0]);
    expect(ticket.status).toBe("open");
    expect(ticket.userId).toBeNull();
    expect(ticket.metadata).toMatchObject({ source: "website", ip: "203.0.113.9", pageUrl: "/report-bug", severity: "high" });
    const fetched = await getTicketById(ticket.id);
    expect(fetched?.subject).toBe("Preview fails");
  });

  it("records topic and company for sales enquiries", async () => {
    const input = ticketSchema.parse({ email: emails[1], subject: "Enterprise enquiry", message: "We have a team of forty and need invoice billing.", company: "Acme", topic: "enterprise" });
    const ticket = await createTicket({ kind: "sales", input });
    expect(ticket.metadata).toMatchObject({ company: "Acme", topic: "enterprise" });
    expect(ticket.name).toBe("");
  });
});

describe("newsletter", () => {
  it("upserts and reports repeat subscriptions, clearing an unsubscribe", async () => {
    const first = await subscribeNewsletter(emails[2]);
    expect(first.alreadySubscribed).toBe(false);
    const again = await subscribeNewsletter(emails[2].toUpperCase());
    expect(again.alreadySubscribed).toBe(true);
    expect(again.id).toBe(first.id);

    await db.update(newsletterSubscribers).set({ unsubscribedAt: new Date() }).where(eq(newsletterSubscribers.id, first.id));
    const resub = await subscribeNewsletter(emails[2]);
    expect(resub.alreadySubscribed).toBe(false);
    const [row] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.id, first.id));
    expect(row.unsubscribedAt).toBeNull();
  });
});
