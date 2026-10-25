/**
 * Route-level test for GET /api/v1/search. Runs the real handler (content
 * index, validation, rate limiting against the test database).
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { GET } from "@/app/api/v1/search/route";

const call = (qs: string) => GET(new Request(`http://localhost/api/v1/search${qs}`, { headers: { "x-forwarded-for": `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } }), undefined);

describe("GET /api/v1/search", () => {
  it("returns typed results with hrefs and snippets", async () => {
    const res = await call("?q=deploy");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: { type: string; title: string; description: string; href: string; snippet: string }[]; query: string };
    expect(body.query).toBe("deploy");
    expect(body.results[0]).toMatchObject({ type: "docs", href: "/docs/deployment" });
    for (const r of body.results) {
      expect(r.href.startsWith("/")).toBe(true);
      expect(typeof r.snippet).toBe("string");
      expect("score" in r).toBe(false);
    }
  });

  it("returns suggestions instead of results for short queries", async () => {
    const body = (await (await call("?q=d")).json()) as { results: unknown[]; suggestions: { title: string; href: string }[] };
    expect(body.results).toEqual([]);
    expect(body.suggestions.length).toBeGreaterThan(0);
  });

  it("honours the type filter and rejects unknown types", async () => {
    const ok = (await (await call("?q=react&type=templates")).json()) as { results: { type: string }[] };
    expect(ok.results.length).toBeGreaterThan(0);
    expect(ok.results.every((r) => r.type === "templates")).toBe(true);
    const bad = await call("?q=react&type=nope");
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as { error: { code: string } }).error.code).toBe("bad_request");
  });

  it("validates the limit parameter", async () => {
    expect((await call("?q=deploy&limit=999")).status).toBe(400);
    const body = (await (await call("?q=deploy&limit=2")).json()) as { results: unknown[] };
    expect(body.results.length).toBeLessThanOrEqual(2);
  });
});
