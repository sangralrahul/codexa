import type { ProviderAdapter } from "../types";
import { httpProbe, statusMessage } from "./http";

export const stripeAdapter: ProviderAdapter = {
  id: "stripe",
  validate(_c, secret) {
    if (!/^(sk|rk)_(live|test)_/.test(secret.secretKey ?? "")) throw new Error("Stripe secret key should start with sk_live_, sk_test_ or rk_");
  },
  test: (_c, secret) =>
    httpProbe(
      "https://api.stripe.com/v1/balance",
      { headers: { Authorization: `Bearer ${secret.secretKey}` } },
      (status, body) => {
        if (status === 200) {
          const live = body && typeof body === "object" && "livemode" in body ? Boolean((body as { livemode: boolean }).livemode) : null;
          return { ok: true, message: `Stripe key accepted (${live ? "live" : "test"} mode)`, details: { livemode: live } };
        }
        return { ok: false, message: statusMessage(status, "Stripe") };
      },
    ),
};

export const razorpayAdapter: ProviderAdapter = {
  id: "razorpay",
  validate(config, secret) {
    if (!(config.keyId ?? "").trim()) throw new Error("Key ID is required");
    if (!(secret.keySecret ?? "").trim()) throw new Error("Key secret is required");
  },
  test: (config, secret) =>
    httpProbe(
      "https://api.razorpay.com/v1/payments?count=1",
      { headers: { Authorization: `Basic ${Buffer.from(`${config.keyId}:${secret.keySecret}`).toString("base64")}` } },
      (status) => (status === 200 ? { ok: true, message: "Razorpay credentials accepted" } : { ok: false, message: statusMessage(status, "Razorpay") }),
    ),
};

export const resendAdapter: ProviderAdapter = {
  id: "resend",
  validate(_c, secret) {
    if (!(secret.apiKey ?? "").trim()) throw new Error("API key is required");
  },
  test: (_c, secret) =>
    httpProbe(
      "https://api.resend.com/domains",
      { headers: { Authorization: `Bearer ${secret.apiKey}` } },
      (status, body) => {
        if (status === 200) {
          const data = body && typeof body === "object" && Array.isArray((body as { data?: unknown[] }).data) ? (body as { data: unknown[] }).data : [];
          return { ok: true, message: `Resend key accepted (${data.length} domains)`, details: { domains: data.length } };
        }
        return { ok: false, message: statusMessage(status, "Resend") };
      },
    ),
};

export const vercelAdapter: ProviderAdapter = {
  id: "vercel",
  validate(_c, secret) {
    if (!(secret.token ?? "").trim()) throw new Error("Access token is required");
  },
  test: (config, secret) =>
    httpProbe(
      `https://api.vercel.com/v2/user${config.teamId ? `?teamId=${encodeURIComponent(config.teamId)}` : ""}`,
      { headers: { Authorization: `Bearer ${secret.token}` } },
      (status, body) => {
        if (status === 200) {
          const user = body && typeof body === "object" && "user" in body ? (body as { user: { username?: string } }).user : null;
          return { ok: true, message: `Vercel token accepted${user?.username ? ` (${user.username})` : ""}`, details: { username: user?.username ?? null } };
        }
        return { ok: false, message: statusMessage(status, "Vercel") };
      },
    ),
};
