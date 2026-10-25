import { describe, expect, it } from "vitest";
import { crossOriginRejected, handler } from "@/lib/api";
import { env } from "@/lib/env";

const app = new URL(env.APP_URL).origin;
const req = (method: string, origin?: string, url = `${app}/api/v1/projects`) =>
  new Request(url, { method, headers: origin ? { origin } : {} });

describe("cross-origin protection for mutating API requests", () => {
  it("allows safe methods from anywhere", () => {
    expect(crossOriginRejected(req("GET", "https://evil.example"))).toBe(false);
  });

  it("allows requests without an Origin (webhooks, cron, CLI)", () => {
    expect(crossOriginRejected(req("POST"))).toBe(false);
  });

  it("allows the app's own origin and the request's own origin", () => {
    expect(crossOriginRejected(req("POST", app))).toBe(false);
    expect(crossOriginRejected(req("DELETE", "http://127.0.0.1:8787", "http://127.0.0.1:8787/api/v1/x"))).toBe(false);
  });

  it("rejects sibling preview subdomains and opaque origins", () => {
    expect(crossOriginRejected(req("POST", "https://abc123.preview.codexa.example"))).toBe(true);
    expect(crossOriginRejected(req("PUT", "null"))).toBe(true);
  });

  it("handler answers 403 before running the route", async () => {
    let ran = false;
    const route = handler(async () => {
      ran = true;
      return new Response("ok");
    });
    const res = await route(req("POST", "https://site.sites.codexa.example"), {});
    expect(res.status).toBe(403);
    expect(ran).toBe(false);
  });
});
