import fs from "node:fs";
import path from "node:path";
import { API_ENDPOINTS, endpointKey, routeFileForPath, type ApiEndpoint, type ApiManifest, type EndpointStatus, type ResolvedEndpoint } from "./api-registry";

/*
 * Build-time only: scans src/app for route handlers. Imported by
 * scripts/generate-api-manifest.ts and tests, never by pages (a dynamic
 * filesystem scan would make the bundler trace the whole project).
 */

/**
 * Find the route file on disk for an endpoint, honouring dynamic folders:
 * a literal segment such as `newsletter` is satisfied by a `[kind]` folder
 * when no literal folder exists, exactly as the App Router resolves it.
 * Returns the repo-relative file path (posix separators) or null.
 */
export function findRouteFile(endpointPath: string, rootDir: string): string | null {
  const clean = endpointPath.split("?")[0];
  const segments = clean.split("/").filter(Boolean);
  let dir = path.join(rootDir, "src", "app");
  const rel: string[] = ["src", "app"];
  for (const seg of segments) {
    const wanted = seg.startsWith(":") ? `[${seg.slice(1)}]` : seg;
    let entries: string[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return null;
    }
    let match: string | undefined = entries.find((e) => e === wanted);
    if (!match && !seg.startsWith(":")) match = entries.find((e) => /^\[[^\].]+\]$/.test(e));
    if (!match) match = entries.find((e) => /^\[\.\.\./.test(e));
    if (!match) return null;
    dir = path.join(dir, match);
    rel.push(match);
    if (/^\[\.\.\./.test(match)) break;
  }
  const file = path.join(dir, "route.ts");
  if (!fs.existsSync(file)) return null;
  return [...rel, "route.ts"].join("/");
}

/**
 * Verify an endpoint against the filesystem: the route file must exist and
 * export the HTTP method. Anything else is reported as planned regardless of
 * the registry's intent so the docs never overstate what ships.
 */
export function resolveEndpointStatus(endpoint: ApiEndpoint, rootDir: string): ResolvedEndpoint {
  const fallback = routeFileForPath(endpoint.path);
  if (endpoint.status === "planned") return { ...endpoint, resolvedStatus: "planned", routeFile: fallback };
  const found = findRouteFile(endpoint.path, rootDir);
  let resolvedStatus: EndpointStatus = "planned";
  if (found) {
    const src = fs.readFileSync(path.join(rootDir, found), "utf8");
    const exportsMethod =
      new RegExp(`export\\s+(?:const|let|async\\s+function|function)\\s+${endpoint.method}\\b`).test(src) ||
      new RegExp(`export\\s*\\{[^}]*\\b${endpoint.method}\\b[^}]*\\}`).test(src);
    if (exportsMethod) resolvedStatus = "implemented";
  }
  return { ...endpoint, resolvedStatus, routeFile: found ?? fallback };
}

/** Build the manifest consumed by resolveAllEndpoints(). */
export function buildApiManifest(rootDir: string): ApiManifest {
  const out: ApiManifest = {};
  for (const e of API_ENDPOINTS) {
    const r = resolveEndpointStatus(e, rootDir);
    out[endpointKey(r)] = { resolvedStatus: r.resolvedStatus, routeFile: r.routeFile };
  }
  return out;
}
