/**
 * Route-level tests for the public templates API. No database involved.
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { GET as list } from "@/app/api/v1/templates/route";
import { GET as detail } from "@/app/api/v1/templates/[id]/route";
import { TEMPLATES } from "@/templates";

const call = (qs = "") => list(new Request(`http://localhost/api/v1/templates${qs}`), undefined);
const one = (id: string) => detail(new Request(`http://localhost/api/v1/templates/${id}`), { params: Promise.resolve({ id }) });

type Summary = { id: string; name: string; framework: string; category: string; fileCount: number; featured?: boolean; difficulty: string };

describe("GET /api/v1/templates", () => {
  it("lists every template without file contents and with a fileCount", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("public");
    const body = (await res.json()) as { templates: (Summary & { files?: unknown; settings?: unknown })[]; total: number; categories: { id: string }[] };
    expect(body.total).toBe(TEMPLATES.length);
    expect(body.templates.length).toBe(TEMPLATES.length);
    for (const t of body.templates) {
      expect(t.files).toBeUndefined();
      expect(t.settings).toBeUndefined();
      expect(t.fileCount).toBeGreaterThan(0);
    }
    expect(body.categories.length).toBeGreaterThan(5);
  });

  it("filters by q, category and framework and sorts", async () => {
    const saas = (await (await call("?category=saas")).json()) as { templates: Summary[] };
    expect(saas.templates.length).toBeGreaterThan(0);
    expect(saas.templates.every((t) => t.category === "saas")).toBe(true);

    const statics = (await (await call("?framework=static&sort=name")).json()) as { templates: Summary[] };
    expect(statics.templates.every((t) => t.framework === "static")).toBe(true);
    const names = statics.templates.map((t) => t.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));

    const q = (await (await call("?q=express")).json()) as { templates: Summary[]; query: { q: string } };
    expect(q.query.q).toBe("express");
    expect(q.templates.some((t) => t.framework === "node-express")).toBe(true);

    const none = (await (await call("?q=zzz-nothing")).json()) as { templates: Summary[]; total: number };
    expect(none.total).toBe(0);
  });

  it("ignores unknown filter values instead of failing", async () => {
    const res = await call("?category=bogus&framework=nextjs&sort=evil");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { total: number; query: { category: string; framework: string; sort: string } };
    expect(body.total).toBe(TEMPLATES.length);
    expect(body.query).toEqual({ q: "", category: "all", framework: "all", sort: "featured" });
  });
});

describe("GET /api/v1/templates/:id", () => {
  it("returns the template with files and settings", async () => {
    const res = await one("vite-react-starter");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { template: { id: string; files: Record<string, string>; settings: { devCommand: string }; fileCount: number } };
    expect(body.template.id).toBe("vite-react-starter");
    expect(body.template.files["src/App.tsx"]).toContain("export default");
    expect(body.template.fileCount).toBe(Object.keys(body.template.files).length);
    expect(body.template.settings.devCommand).toBe("npm run dev");
  });

  it("404s for unknown ids", async () => {
    const res = await one("does-not-exist");
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("not_found");
  });
});
