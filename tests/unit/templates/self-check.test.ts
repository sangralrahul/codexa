/**
 * Template self-check: every starter must be runnable with the runner's
 * prebuilt dependency sets, internally consistent, and safe to copy into a
 * project (normalized paths). Fails loudly when a new template breaks a rule.
 */
import { describe, expect, it } from "vitest";
import { FRAMEWORKS, TEMPLATE_CATEGORIES, TEMPLATE_FRAMEWORKS, TEMPLATES, type Template } from "@/templates";
import { NODE_SETTINGS, STATIC_SETTINGS, VITE_SETTINGS } from "@/templates/shared";

const ALLOWED_DEPS: Record<string, (name: string) => boolean> = {
  "vite-react": (n) => ["react", "react-dom", "vite", "@vitejs/plugin-react", "tailwindcss", "@tailwindcss/vite", "typescript", "@types/react", "@types/react-dom"].includes(n),
  static: () => false,
  "node-express": (n) => ["express", "zod", "tsx", "typescript"].includes(n) || n.startsWith("@types/"),
};

type Pkg = { name?: string; scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

function parsePackageJson(t: Template): Pkg | null {
  const raw = t.files["package.json"];
  if (raw === undefined) return null;
  return JSON.parse(raw) as Pkg;
}

/** Resolve a relative import inside the template's virtual file system. */
function resolveImport(files: Record<string, string>, from: string, spec: string): boolean {
  const dir = from.split("/").slice(0, -1);
  const parts = spec.split("/");
  const stack = [...dir];
  for (const p of parts) {
    if (p === ".") continue;
    if (p === "..") stack.pop();
    else stack.push(p);
  }
  const base = stack.join("/");
  // NodeNext resolution: "./x.js" refers to "./x.ts" in source.
  const stem = base.replace(/\.js$/, "");
  const candidates = [base, `${stem}.ts`, `${stem}.tsx`, `${stem}.js`, `${base}.css`, `${stem}/index.ts`, `${stem}/index.tsx`];
  return candidates.some((c) => c in files);
}

describe("template catalog", () => {
  it("has unique, slug-like ids and covers every category", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    for (const c of TEMPLATE_CATEGORIES) expect(TEMPLATES.some((t) => t.category === c.id), `category ${c.id} has no template`).toBe(true);
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(15);
  });

  it("features at least six templates and only uses runnable frameworks", () => {
    expect(TEMPLATES.filter((t) => t.featured).length).toBeGreaterThanOrEqual(6);
    for (const t of TEMPLATES) {
      expect(TEMPLATE_FRAMEWORKS as readonly string[]).toContain(t.framework);
      expect(t.prebuilt).toBe(true);
    }
  });

  describe.each(TEMPLATES.map((t) => [t.id, t] as const))("%s", (_id, t) => {
    it("has complete metadata", () => {
      expect(t.name.length).toBeGreaterThan(2);
      expect(t.description.length).toBeGreaterThan(20);
      expect((t.longDescription ?? "").length).toBeGreaterThan(40);
      expect(t.tags.length).toBeGreaterThan(0);
      expect(["beginner", "intermediate", "advanced"]).toContain(t.difficulty);
      expect(TEMPLATE_CATEGORIES.map((c) => c.id)).toContain(t.category);
      expect(t.previewPath ?? "/").toMatch(/^\//);
      expect(Object.keys(t.files).length).toBeGreaterThan(0);
    });

    it("uses normalized file paths", () => {
      for (const path of Object.keys(t.files)) {
        expect(path.startsWith("/"), `${path} has a leading slash`).toBe(false);
        expect(path.startsWith("./"), `${path} starts with ./`).toBe(false);
        expect(path.split("/").includes(".."), `${path} contains ..`).toBe(false);
        expect(path.includes("\\"), `${path} contains a backslash`).toBe(false);
        expect(path.includes("//"), `${path} contains //`).toBe(false);
        expect(path.trim()).toBe(path);
        expect(typeof t.files[path]).toBe("string");
      }
    });

    it("matches the framework's run conventions", () => {
      const fw = FRAMEWORKS[t.framework];
      const pkg = parsePackageJson(t);
      if (t.framework === "static") {
        expect(t.files["index.html"]).toBeDefined();
        expect(t.settings).toEqual(STATIC_SETTINGS);
        if (pkg) {
          expect(Object.keys(pkg.dependencies ?? {})).toEqual([]);
          expect(Object.keys(pkg.devDependencies ?? {})).toEqual([]);
        }
        expect(t.dependencies).toEqual({});
        return;
      }
      expect(pkg, "package.json must exist and parse").not.toBeNull();
      expect(pkg!.scripts?.dev, "scripts.dev").toBeTruthy();
      expect(pkg!.scripts?.build, "scripts.build").toBeTruthy();
      expect(fw.devCommand).toBe("npm run dev");
      expect(fw.buildCommand).toBe("npm run build");
      if (t.framework === "vite-react") {
        expect(pkg!.scripts!.dev).toMatch(/^vite\b/);
        expect(pkg!.scripts!.build).toMatch(/vite build/);
        expect(t.files["index.html"]).toBeDefined();
        expect(t.files["src/main.tsx"]).toBeDefined();
        expect(t.files["src/App.tsx"]).toBeDefined();
        expect(t.files["vite.config.ts"]).toBeDefined();
        expect(t.files["index.html"]).toContain("/src/main.tsx");
        expect(t.settings).toEqual(VITE_SETTINGS);
      } else {
        expect(pkg!.scripts!.dev).toMatch(/^tsx\b/);
        expect(pkg!.scripts!.build).toMatch(/^tsc\b/);
        const entry = pkg!.scripts!.dev.split(/\s+/).pop()!;
        expect(t.files[entry], `dev entry ${entry} exists`).toBeDefined();
        expect(t.settings).toEqual(NODE_SETTINGS);
      }
    });

    it("declares only dependencies the runtime has prebuilt", () => {
      const pkg = parsePackageJson(t);
      if (!pkg) return;
      const allowed = ALLOWED_DEPS[t.framework];
      const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      for (const name of Object.keys(all)) expect(allowed(name), `${name} is not an allowed dependency for ${t.framework}`).toBe(true);
      // Documented dependencies must come from package.json (no phantom entries).
      for (const [name, version] of Object.entries(t.dependencies)) {
        expect(all[name], `documented dependency ${name} missing from package.json`).toBe(version);
      }
    });

    it("has resolvable relative imports in its TypeScript sources", () => {
      for (const [path, content] of Object.entries(t.files)) {
        if (!/\.(ts|tsx)$/.test(path)) continue;
        const specs = [...content.matchAll(/from\s+["'](\.{1,2}\/[^"']+)["']/g), ...content.matchAll(/import\s+["'](\.{1,2}\/[^"']+)["']/g)].map((m) => m[1]);
        for (const spec of specs) expect(resolveImport(t.files, path, spec), `${path} imports ${spec} which does not exist`).toBe(true);
      }
    });
  });
});
