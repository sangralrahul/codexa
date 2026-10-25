import { z } from "zod";

/**
 * Form schemas shared by the browser (pre-submit validation) and the API
 * routes (authoritative validation). Keep this file free of server-only imports.
 */
export const TICKET_KINDS = ["contact", "support", "bug", "feature", "feedback", "sales", "demo", "disclosure"] as const;
export type TicketKind = (typeof TICKET_KINDS)[number];
export const FORM_KINDS = [...TICKET_KINDS, "newsletter"] as const;
export type FormKind = (typeof FORM_KINDS)[number];

export const HONEYPOT_FIELD = "website";

const email = z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(254);
const honeypot = z.string().max(0, "Spam check failed").optional();

export const ticketSchema = z.object({
  name: z.string().trim().max(100, "Name is too long").optional().default(""),
  email,
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(200, "Subject is too long"),
  message: z.string().trim().min(10, "Please add at least 10 characters").max(5000, "Message is too long (5,000 characters max)"),
  company: z.string().trim().max(200).optional(),
  topic: z.string().trim().max(100).optional(),
  pageUrl: z.string().trim().max(500).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  [HONEYPOT_FIELD]: honeypot,
});
export type TicketInput = z.infer<typeof ticketSchema>;

export const newsletterSchema = z.object({
  email,
  [HONEYPOT_FIELD]: honeypot,
});
export type NewsletterInput = z.infer<typeof newsletterSchema>;

export function isTicketKind(kind: string): kind is TicketKind {
  return (TICKET_KINDS as readonly string[]).includes(kind);
}

export function isFormKind(kind: string): kind is FormKind {
  return (FORM_KINDS as readonly string[]).includes(kind);
}

/** True when a bot filled the hidden honeypot field. Real browsers leave it empty. */
export function isHoneypotTripped(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const v = (raw as Record<string, unknown>)[HONEYPOT_FIELD];
  return typeof v === "string" && v.trim().length > 0;
}

/** Flatten zod issues to { field: message } for inline display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
