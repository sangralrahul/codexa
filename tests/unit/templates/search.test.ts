import { describe, expect, it } from "vitest";
import { getTemplate, parseTemplateSearch, searchTemplates, summarizeTemplate, TEMPLATE_CATEGORIES, TEMPLATES } from "@/templates";
import { parseIntegrationSearch, searchIntegrations } from "@/components/integrations-directory/search";
import { INTEGRATIONS } from "@/config/integrations";

describe("searchTemplates", () => {
  it("returns everything, featured first then alphabetical, by default", () => {
    const all = searchTemplates();
    expect(all.length).toBe(TEMPLATES.length);
    const firstNonFeatured = all.findIndex((t) => !t.featured);
    expect(all.slice(0, firstNonFeatured).every((t) => t.featured)).toBe(true);
    expect(all.slice(firstNonFeatured).some((t) => t.featured)).toBe(false);
    const names = all.slice(firstNonFeatured).map((t) => t.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("filters by category and framework", () => {
    for (const c of TEMPLATE_CATEGORIES) {
      const list = searchTemplates({ category: c.id });
      expect(list.length).toBeGreaterThan(0);
      expect(list.every((t) => t.category === c.id)).toBe(true);
    }
    const statics = searchTemplates({ framework: "static" });
    expect(statics.every((t) => t.framework === "static")).toBe(true);
    const combined = searchTemplates({ category: "landing-pages", framework: "static" });
    expect(combined.every((t) => t.category === "landing-pages" && t.framework === "static")).toBe(true);
    expect(searchTemplates({ category: "all", framework: "all" }).length).toBe(TEMPLATES.length);
  });

  it("matches free text against name, description, tags and framework name, case-insensitively", () => {
    const byTag = searchTemplates({ q: "EXPRESS" });
    expect(byTag.length).toBeGreaterThan(0);
    expect(byTag.every((t) => t.framework === "node-express" || t.tags.includes("express") || /express/i.test(t.name + t.description + (t.longDescription ?? "")))).toBe(true);
    expect(searchTemplates({ q: "kanban" }).some((t) => t.tags.includes("kanban") || /kanban/i.test(t.name + t.description))).toBe(true);
    expect(searchTemplates({ q: "zzz-no-such-template" })).toEqual([]);
    expect(searchTemplates({ q: "   " }).length).toBe(TEMPLATES.length);
  });

  it("sorts by name and by difficulty", () => {
    const byName = searchTemplates({ sort: "name" }).map((t) => t.name);
    expect(byName).toEqual([...byName].sort((a, b) => a.localeCompare(b)));
    const order = { beginner: 0, intermediate: 1, advanced: 2 } as const;
    const byDifficulty = searchTemplates({ sort: "difficulty" }).map((t) => order[t.difficulty]);
    expect(byDifficulty).toEqual([...byDifficulty].sort((a, b) => a - b));
  });

  it("parses untrusted query strings safely", () => {
    expect(parseTemplateSearch({})).toEqual({ q: "", category: "all", framework: "all", sort: "featured" });
    expect(parseTemplateSearch({ q: "x".repeat(500), category: "nope", framework: "nextjs", sort: "evil" })).toEqual({ q: "x".repeat(100), category: "all", framework: "all", sort: "featured" });
    expect(parseTemplateSearch({ category: "saas", framework: "vite-react", sort: "name" })).toEqual({ q: "", category: "saas", framework: "vite-react", sort: "name" });
  });

  it("summaries never include file contents", () => {
    const t = getTemplate("vite-react-starter")!;
    const s = summarizeTemplate(t);
    expect("files" in s).toBe(false);
    expect("settings" in s).toBe(false);
    expect(s.fileCount).toBe(Object.keys(t.files).length);
    expect(s.frameworkName).toBe("Vite + React + TypeScript");
    expect(s.longDescription.length).toBeGreaterThan(0);
  });
});

describe("searchIntegrations", () => {
  it("lists available integrations before planned ones", () => {
    const all = searchIntegrations();
    expect(all.length).toBe(INTEGRATIONS.length);
    const firstPlanned = all.findIndex((i) => i.status === "planned");
    expect(all.slice(0, firstPlanned).every((i) => i.status === "available")).toBe(true);
    expect(all.slice(firstPlanned).every((i) => i.status === "planned")).toBe(true);
  });

  it("filters by status, category and text", () => {
    expect(searchIntegrations({ status: "planned" }).every((i) => i.status === "planned")).toBe(true);
    expect(searchIntegrations({ category: "databases" }).map((i) => i.id)).toEqual(expect.arrayContaining(["postgres", "supabase"]));
    expect(searchIntegrations({ q: "upi" }).map((i) => i.id)).toEqual(["razorpay"]);
    expect(searchIntegrations({ q: "nothing-here" })).toEqual([]);
  });

  it("parses untrusted query strings safely", () => {
    expect(parseIntegrationSearch({ q: null, category: "bogus", status: "weird" })).toEqual({ q: "", category: "all", status: "all" });
    expect(parseIntegrationSearch({ q: "pg", category: "databases", status: "available" })).toEqual({ q: "pg", category: "databases", status: "available" });
  });
});
