/**
 * Client review on Codexa-hosted sites (worker/sites.ts): the inspector tag is added only when a
 * page is requested with ?__codexa_review=1, the script is served at /__codexa/inspect.js, and
 * review responses are uncached and frameable by the app.
 */
import { describe, expect, it } from "vitest";
import { isReviewRequest, reviewFrameAncestors, serveSite } from "../../../worker/sites";
import { INSPECTOR_JS, INSPECTOR_PATH, INSPECTOR_TAG } from "../../../services/runner/inspector";
import type { Env } from "../../../worker/env";

const PAGE = "<!doctype html><html><head><title>Shop</title></head><body><h1>Hi</h1></body></html>";

function fakeEnv(files: Record<string, string>, appUrl = "https://codexa.example.com"): Env {
  const stmt = { bind: () => stmt, first: async () => ({ id: "dep1", project_id: "p1" }), run: async () => ({}) };
  return {
    DB: { prepare: () => stmt },
    STORAGE: {
      get: async (key: string) => {
        const path = key.replace(/^sites\/dep1\//, "");
        if (!(path in files)) return null;
        const text = files[path];
        return { httpEtag: '"etag-1"', body: new Response(text).body, text: async () => text };
      },
    },
    APP_URL: appUrl,
  } as unknown as Env;
}

const get = (url: string, headers: Record<string, string> = {}) => new Request(url, { headers });

describe("review mode on hosted sites", () => {
  it("detects the review parameter", () => {
    expect(isReviewRequest(new URL("https://shop.sites.test/?__codexa_review=1"))).toBe(true);
    expect(isReviewRequest(new URL("https://shop.sites.test/?__codexa_review=0"))).toBe(false);
    expect(isReviewRequest(new URL("https://shop.sites.test/"))).toBe(false);
  });

  it("allows the app origin to frame review pages", () => {
    expect(reviewFrameAncestors("https://codexa.example.com/dashboard")).toBe("frame-ancestors 'self' https://codexa.example.com");
    expect(reviewFrameAncestors(undefined)).toBe("frame-ancestors 'self'");
    expect(reviewFrameAncestors("not a url")).toBe("frame-ancestors 'self'");
  });

  it("never injects without the parameter", async () => {
    const res = await serveSite(get("https://shop.sites.test/"), fakeEnv({ "index.html": PAGE }), { slug: "shop" });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(PAGE);
    expect(res.headers.get("content-security-policy")).toBe("frame-ancestors 'self'");
    expect(res.headers.get("etag")).toBe('"etag-1"');
  });

  it("injects the inspector tag with the parameter (also for SPA fallbacks), uncached", async () => {
    const env = fakeEnv({ "index.html": PAGE });
    for (const url of ["https://shop.sites.test/?__codexa_review=1", "https://shop.sites.test/pricing?__codexa_review=1"]) {
      const res = await serveSite(get(url), env, { slug: "shop" });
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain(`${INSPECTOR_TAG}</head>`);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(res.headers.get("etag")).toBeNull();
      expect(res.headers.get("content-security-policy")).toBe("frame-ancestors 'self' https://codexa.example.com");
    }
  });

  it("does not touch non-HTML files in review mode, and a 304 never skips the injection", async () => {
    const env = fakeEnv({ "index.html": PAGE, "app.js": "console.log(1)" });
    const js = await serveSite(get("https://shop.sites.test/app.js?__codexa_review=1"), env, { slug: "shop" });
    expect(await js.text()).toBe("console.log(1)");
    const html = await serveSite(get("https://shop.sites.test/?__codexa_review=1", { "if-none-match": '"etag-1"' }), env, { slug: "shop" });
    expect(html.status).toBe(200);
    expect(await html.text()).toContain(INSPECTOR_TAG);
  });

  it("serves the inspector script", async () => {
    const res = await serveSite(get(`https://shop.sites.test${INSPECTOR_PATH}`), fakeEnv({}), { slug: "shop" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("javascript");
    expect(await res.text()).toBe(INSPECTOR_JS);
  });

  it("the inspector script parses and knows the locate protocol", () => {
    expect(() => new Function(INSPECTOR_JS)).not.toThrow();
    expect(INSPECTOR_JS).toContain('"locate"');
    expect(INSPECTOR_JS).toContain('type: "located"');
    expect(INSPECTOR_JS).toContain("__codexa_review");
  });
});
