import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { FOOTER, NAV, PUBLIC_ROUTES, getRoute } from "@/config/routes";
import { PRODUCT_PAGES } from "@/content/marketing/product";
import { SOLUTIONS } from "@/content/marketing/solutions";
import { TRUST_PAGES } from "@/content/marketing/trust";
import { COMPANY_PAGES } from "@/content/marketing/company";
import { PRICING_PAGES } from "@/content/marketing/pricing";
import { SUPPORT_PAGES } from "@/content/marketing/support";

describe("PUBLIC_ROUTES manifest", () => {
  it("has no duplicate paths", () => {
    const paths = PUBLIC_ROUTES.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("every path starts with / and has no trailing slash (except root)", () => {
    for (const r of PUBLIC_ROUTES) {
      expect(r.path.startsWith("/")).toBe(true);
      if (r.path !== "/") expect(r.path.endsWith("/")).toBe(false);
      expect(r.path).not.toMatch(/\s/);
    }
  });

  it("every route has a non-empty title and description", () => {
    for (const r of PUBLIC_ROUTES) {
      expect(r.title.trim().length).toBeGreaterThan(0);
      expect(r.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("nav and footer links resolve to manifest routes", () => {
    const all = [...Object.values(NAV).flat().map((i) => i.href), ...Object.values(FOOTER).flat()];
    for (const href of all) expect(getRoute(href), `missing route for ${href}`).toBeDefined();
  });
});

describe("marketing content matches the manifest", () => {
  const contentPaths = [...Object.keys(PRODUCT_PAGES), ...Object.keys(TRUST_PAGES), ...Object.keys(COMPANY_PAGES), ...Object.keys(PRICING_PAGES), ...Object.keys(SUPPORT_PAGES)];

  it("every content page path is a public route and its key matches its path field", () => {
    const all = { ...TRUST_PAGES, ...COMPANY_PAGES, ...PRICING_PAGES, ...SUPPORT_PAGES };
    for (const [key, page] of Object.entries(all)) {
      expect(page.path).toBe(key);
      expect(getRoute(key), `content page ${key} not in manifest`).toBeDefined();
    }
    for (const [key, page] of Object.entries(PRODUCT_PAGES)) {
      expect(page.path).toBe(key);
      expect(getRoute(key)).toBeDefined();
    }
  });

  it("every solution slug is a public route", () => {
    for (const s of SOLUTIONS) expect(getRoute(`/solutions/${s.slug}`), `solution ${s.slug}`).toBeDefined();
    const slugs = SOLUTIONS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("section ids are unique within each content page", () => {
    const all = { ...TRUST_PAGES, ...COMPANY_PAGES, ...PRICING_PAGES, ...SUPPORT_PAGES };
    for (const page of Object.values(all)) {
      const ids = page.sections.map((s) => s.id);
      expect(new Set(ids).size, page.path).toBe(ids.length);
    }
  });

  it("legal pages carry a review note", () => {
    for (const p of ["/privacy", "/terms", "/acceptable-use", "/cookie-policy", "/data-processing", "/subprocessors", "/data-retention", "/refund-policy"]) {
      const page = TRUST_PAGES[p] ?? PRICING_PAGES[p];
      expect(page?.review, p).toBeDefined();
    }
  });

  it("internal links inside content resolve to a manifest route or an app route file", () => {
    const appDir = path.join(process.cwd(), "src", "app");
    const known = new Set(PUBLIC_ROUTES.map((r) => r.path));
    const linkRe = /\]\((\/[^)\s#]*)/g;
    const text = JSON.stringify([TRUST_PAGES, COMPANY_PAGES, PRICING_PAGES, SUPPORT_PAGES, PRODUCT_PAGES, SOLUTIONS]);
    const missing = new Set<string>();
    for (const m of text.matchAll(linkRe)) {
      const href = m[1];
      if (known.has(href)) continue;
      // App routes outside the manifest (e.g. /settings/billing) or generated files (/icon).
      const candidates = [path.join(appDir, "(app)", href, "page.tsx"), path.join(appDir, "(marketing)", href, "page.tsx"), path.join(appDir, `${href.slice(1)}.tsx`)];
      if (!candidates.some((c) => existsSync(c))) missing.add(href);
    }
    // /settings/billing belongs to the billing owner and may not exist yet; everything else must resolve.
    const tolerated = new Set(["/settings/billing"]);
    expect([...missing].filter((m) => !tolerated.has(m))).toEqual([]);
    expect(contentPaths.length).toBeGreaterThan(30);
  });
});
