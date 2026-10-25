import { beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { collectSearchDocuments, createSearchIndex, runSearch, runSuggestions, type SearchIndex } from "@/lib/content/search";

let index: SearchIndex;
beforeAll(async () => {
  index = createSearchIndex(await collectSearchDocuments());
});

describe("search ranking", () => {
  it('returns the deployment doc first for "deploy"', () => {
    const results = runSearch(index, "deploy");
    expect(results[0]?.href).toBe("/docs/deployment");
  });

  it("ranks exact title matches first", () => {
    expect(runSearch(index, "troubleshooting")[0]?.href).toBe("/docs/troubleshooting");
    expect(runSearch(index, "glossary snapshot", { type: "glossary" })[0]?.href).toBe("/glossary#snapshot");
  });

  it("finds error codes mentioned in the body", () => {
    const hrefs = runSearch(index, "quota_exceeded").map((r) => r.href);
    expect(hrefs).toContain("/docs/troubleshooting");
  });

  it("filters by type and includes templates", () => {
    expect(runSearch(index, "react", { type: "templates" }).every((r) => r.type === "templates")).toBe(true);
    expect(runSearch(index, "react", { type: "templates" }).length).toBeGreaterThan(0);
    expect(runSearch(index, "snapshot", { type: "blog" }).map((r) => r.href)).toEqual(["/blog/why-codexa-snapshots-before-every-ai-run"]);
  });

  it("falls back to OR matching for multi-word queries and returns snippets", () => {
    const results = runSearch(index, "custom domain cname propagation");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snippet.length).toBeGreaterThan(0);
  });

  it("returns nothing for empty queries and suggestions for short ones", () => {
    expect(runSearch(index, "  ")).toEqual([]);
    const suggestions = runSuggestions(index, "de");
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((s) => s.title.toLowerCase().includes("de"))).toBe(true);
  });
});
