/**
 * Static route extraction for the Express templates: reads `app.<method>("/path")`,
 * `app.use("/prefix", someRouter)` and `someRouter.<method>("/path")` from the template's own
 * source files. Pure (no fs), so the capture script and tests can run it on any file map.
 * It never invents a route: anything it cannot read literally is skipped.
 */
export type ApiRoute = { method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; path: string };

const METHODS = ["get", "post", "put", "patch", "delete"] as const;
const ORDER: Record<ApiRoute["method"], number> = { GET: 0, POST: 1, PUT: 2, PATCH: 3, DELETE: 4 };

function join(prefix: string, path: string) {
  const p = `${prefix.replace(/\/$/, "")}/${path.replace(/^\//, "")}`.replace(/\/$/, "");
  return p === "" ? "/" : p;
}

export function parseExpressRoutes(files: Record<string, string>): ApiRoute[] {
  const sources = Object.entries(files).filter(([p]) => /\.(ts|js|mjs)$/.test(p));
  // Router variables declared with Router() / express.Router(), anywhere in the project.
  const routers = new Set<string>();
  for (const [, src] of sources) for (const m of src.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(?:express\.)?Router\(\)/g)) routers.add(m[1]);
  // Mount points: app.use("/prefix", fooRouter)
  const mounts = new Map<string, string>();
  for (const [, src] of sources) for (const m of src.matchAll(/\bapp\.use\(\s*["'`]([^"'`]+)["'`]\s*,\s*(\w+)\s*\)/g)) if (routers.has(m[2])) mounts.set(m[2], m[1]);

  const out: ApiRoute[] = [];
  const re = new RegExp(`\\b(\\w+)\\.(${METHODS.join("|")})\\(\\s*["'\`]([^"'\`]+)["'\`]`, "g");
  for (const [, src] of sources) {
    for (const m of src.matchAll(re)) {
      const [, owner, method, path] = m;
      if (!path.startsWith("/")) continue;
      let full: string | null = null;
      if (owner === "app") full = path;
      else if (routers.has(owner)) full = mounts.has(owner) ? join(mounts.get(owner)!, path) : null;
      if (full) out.push({ method: method.toUpperCase() as ApiRoute["method"], path: full });
    }
  }
  const seen = new Set<string>();
  return out
    .filter((r) => {
      const k = `${r.method} ${r.path}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.path.localeCompare(b.path) || ORDER[a.method] - ORDER[b.method]);
}
