import { afterEach, describe, expect, it, vi } from "vitest";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function load(envPatch: Record<string, string | undefined>) {
  for (const k of ["CUSTOMERIO_APP_API_KEY", "CUSTOMERIO_REGION", "CUSTOMERIO_TRANSACTIONAL_MESSAGE_ID", "RESEND_API_KEY", "EMAIL_PROVIDER"]) delete process.env[k];
  for (const [k, v] of Object.entries(envPatch)) if (v !== undefined) process.env[k] = v;
  process.env.EMAIL_FROM = "Codexa <no-reply@codexa.app>";
  vi.resetModules();
  return import("@/lib/email/providers");
}

const msg = { to: "user@example.com", subject: "Verify your email", html: "<p>Hi</p>", text: "Hi" };

describe("email provider selection", () => {
  it("uses no provider when nothing is configured", async () => {
    const m = await load({});
    expect(m.activeEmailProvider()).toBeNull();
    await expect(m.deliverEmail(msg)).rejects.toThrow(/No email provider/);
  });

  it("prefers Customer.io when both are configured, unless EMAIL_PROVIDER says otherwise", async () => {
    expect((await load({ CUSTOMERIO_APP_API_KEY: "cio", RESEND_API_KEY: "re" })).activeEmailProvider()).toBe("customerio");
    expect((await load({ CUSTOMERIO_APP_API_KEY: "cio", RESEND_API_KEY: "re", EMAIL_PROVIDER: "resend" })).activeEmailProvider()).toBe("resend");
    expect((await load({ RESEND_API_KEY: "re", EMAIL_PROVIDER: "customerio" })).activeEmailProvider()).toBe("resend");
  });

  it("reports email as configured with only a Customer.io key", async () => {
    await load({ CUSTOMERIO_APP_API_KEY: "cio" });
    const env = await import("@/lib/env");
    expect(env.capabilities.email).toBe(true);
    expect(env.capabilities.customerio).toBe(true);
  });
});

describe("Customer.io transactional email", () => {
  it("posts our own HTML to the US endpoint with a Bearer App API key", async () => {
    const m = await load({ CUSTOMERIO_APP_API_KEY: "app-key-123" });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ delivery_id: "dlv_1", queued_at: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await m.deliverEmail(msg);
    expect(r).toEqual({ provider: "customerio", providerId: "dlv_1" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.customer.io/v1/send/email");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer app-key-123");
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({
      to: "user@example.com",
      from: "Codexa <no-reply@codexa.app>",
      subject: "Verify your email",
      body: "<p>Hi</p>",
      body_plaintext: "Hi",
      identifiers: { email: "user@example.com" },
      disable_message_retention: true,
    });
  });

  it("uses the EU endpoint and includes a transactional message id when configured", async () => {
    const m = await load({ CUSTOMERIO_APP_API_KEY: "k", CUSTOMERIO_REGION: "eu", CUSTOMERIO_TRANSACTIONAL_MESSAGE_ID: "codexa_account" });
    expect(m.customerIoEndpoint()).toBe("https://api-eu.customer.io/v1/send/email");
    expect(m.customerIoPayload(msg).transactional_message_id).toBe("codexa_account");
  });

  it("surfaces Customer.io error messages", async () => {
    const m = await load({ CUSTOMERIO_APP_API_KEY: "bad" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ meta: { error: "Unauthorized request" } }), { status: 401 })));
    await expect(m.deliverEmail(msg)).rejects.toThrow("Unauthorized request");
  });
});

describe("Resend", () => {
  it("still sends through Resend when it is the active provider", async () => {
    const m = await load({ RESEND_API_KEY: "re_123" });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "re_msg" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await m.deliverEmail(msg)).toEqual({ provider: "resend", providerId: "re_msg" });
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe("https://api.resend.com/emails");
  });
});
