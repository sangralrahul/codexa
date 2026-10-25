import { describe, expect, it } from "vitest";
import { FORM_KINDS, HONEYPOT_FIELD, TICKET_KINDS, fieldErrors, isFormKind, isHoneypotTripped, isTicketKind, newsletterSchema, ticketSchema } from "@/components/forms/schemas";

const valid = { name: "Asha", email: "asha@example.com", subject: "Preview will not start", message: "Steps: open project, click Run, nothing happens." };

describe("ticketSchema", () => {
  it("accepts a valid submission and normalises optional fields", () => {
    const r = ticketSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.name).toBe("Asha");
      expect(r.data.company).toBeUndefined();
    }
  });

  it("defaults name to an empty string when omitted", () => {
    const r = ticketSchema.safeParse({ ...valid, name: undefined });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.name).toBe("");
  });

  it("rejects bad email, short subject and short message with per-field messages", () => {
    const r = ticketSchema.safeParse({ email: "nope", subject: "x", message: "short" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errs = fieldErrors(r.error);
      expect(errs.email).toMatch(/valid email/i);
      expect(errs.subject).toMatch(/3 characters/);
      expect(errs.message).toMatch(/10 characters/);
    }
  });

  it("enforces maximum lengths", () => {
    const r = ticketSchema.safeParse({ ...valid, message: "a".repeat(5001) });
    expect(r.success).toBe(false);
    const r2 = ticketSchema.safeParse({ ...valid, subject: "a".repeat(201) });
    expect(r2.success).toBe(false);
  });

  it("only allows known severities", () => {
    expect(ticketSchema.safeParse({ ...valid, severity: "high" }).success).toBe(true);
    expect(ticketSchema.safeParse({ ...valid, severity: "urgent" }).success).toBe(false);
  });

  it("rejects a filled honeypot at the schema level too", () => {
    expect(ticketSchema.safeParse({ ...valid, [HONEYPOT_FIELD]: "http://spam.example" }).success).toBe(false);
    expect(ticketSchema.safeParse({ ...valid, [HONEYPOT_FIELD]: "" }).success).toBe(true);
  });
});

describe("newsletterSchema", () => {
  it("trims and validates the email", () => {
    const r = newsletterSchema.safeParse({ email: "  person@example.com " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("person@example.com");
    expect(newsletterSchema.safeParse({ email: "" }).success).toBe(false);
  });
});

describe("honeypot", () => {
  it("is tripped only when the hidden field has content", () => {
    expect(isHoneypotTripped({ [HONEYPOT_FIELD]: "bot" })).toBe(true);
    expect(isHoneypotTripped({ [HONEYPOT_FIELD]: "   " })).toBe(false);
    expect(isHoneypotTripped({ [HONEYPOT_FIELD]: "" })).toBe(false);
    expect(isHoneypotTripped({})).toBe(false);
    expect(isHoneypotTripped(null)).toBe(false);
    expect(isHoneypotTripped("string")).toBe(false);
  });
});

describe("form kinds", () => {
  it("newsletter is a form kind but not a ticket kind", () => {
    expect(isFormKind("newsletter")).toBe(true);
    expect(isTicketKind("newsletter")).toBe(false);
    expect(FORM_KINDS.length).toBe(TICKET_KINDS.length + 1);
  });
  it("rejects unknown kinds", () => {
    expect(isFormKind("admin")).toBe(false);
    expect(isTicketKind("")).toBe(false);
  });
  it("covers every form the website renders", () => {
    for (const k of ["contact", "support", "bug", "feature", "feedback", "sales", "demo", "disclosure"]) expect(isTicketKind(k)).toBe(true);
  });
});
