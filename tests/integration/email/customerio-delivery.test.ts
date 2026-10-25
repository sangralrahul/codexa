import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

const saved = { ...process.env };
afterEach(() => {
  vi.unstubAllGlobals();
});
afterAll(() => {
  process.env = { ...saved };
});

describe("account emails through Customer.io (real test DB, mocked API)", () => {
  it("records the email, sends it, and stores the delivery id", async () => {
    process.env.CUSTOMERIO_APP_API_KEY = "test-app-key";
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_PROVIDER;
    vi.resetModules();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ delivery_id: "dlv_test_42", queued_at: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { emails } = await import("@/lib/email");
    const { db } = await import("@/db");
    const { emailOutbox } = await import("@/db/schema");

    const to = `cio-${Date.now()}@example.com`;
    const r = await emails.verifyEmail(to, "https://codexa.example/verify-email?token=abc");
    expect(r.provider).toBe("customerio");

    const [row] = await db.select().from(emailOutbox).where(eq(emailOutbox.id, r.id));
    expect(row.status).toBe("sent");
    expect(row.provider).toBe("customerio");
    expect(row.providerId).toBe("dlv_test_42");

    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.to).toBe(to);
    expect(body.body).toContain("verify-email?token=abc");
    await db.delete(emailOutbox).where(eq(emailOutbox.id, r.id));
  });

  it("marks the email failed when Customer.io rejects it", async () => {
    process.env.CUSTOMERIO_APP_API_KEY = "test-app-key";
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ meta: { error: "sender domain not verified" } }), { status: 400 })));
    const { emails } = await import("@/lib/email");
    const { db } = await import("@/db");
    const { emailOutbox } = await import("@/db/schema");
    const to = `cio-fail-${Date.now()}@example.com`;
    await expect(emails.resetPassword(to, "https://codexa.example/reset")).rejects.toThrow("sender domain not verified");
    const [row] = await db.select().from(emailOutbox).where(eq(emailOutbox.to, to));
    expect(row.status).toBe("failed");
    expect(row.error).toContain("sender domain not verified");
    await db.delete(emailOutbox).where(eq(emailOutbox.to, to));
  });
});
