import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { API_ENDPOINTS, findRouteFile, resolveAllEndpoints, resolveEndpointStatus, routeFileForPath, type ApiEndpoint } from "@/lib/content/api-registry";

let root: string;
function write(rel: string, content: string) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "codexa-registry-"));
  write("src/app/api/v1/projects/route.ts", "export const GET = handler(async () => json({}));\nexport const POST = handler(async () => json({}));\n");
  write("src/app/api/v1/projects/[id]/route.ts", "export const GET = handler(async () => json({}));\n");
  write("src/app/api/v1/forms/[kind]/route.ts", "async function post() {}\nexport { post as POST };\n");
});
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

const ep = (over: Partial<ApiEndpoint>): ApiEndpoint => ({ id: "x", method: "GET", path: "/api/v1/projects", group: "projects", summary: "", auth: "session", status: "implemented", ...over });

describe("api registry status detection", () => {
  it("maps :params to [param] folders", () => {
    expect(routeFileForPath("/api/v1/projects/:id/files/content?path=")).toBe(path.join("src", "app", "api", "v1", "projects", "[id]", "files", "content", "route.ts"));
  });

  it("finds route files through dynamic folders", () => {
    expect(findRouteFile("/api/v1/forms/newsletter", root)).toBe(path.join("src", "app", "api", "v1", "forms", "[kind]", "route.ts"));
    expect(findRouteFile("/api/v1/projects/:id", root)).toBe(path.join("src", "app", "api", "v1", "projects", "[id]", "route.ts"));
    expect(findRouteFile("/api/v1/missing", root)).toBeNull();
  });

  it("marks an endpoint implemented only when the file exports the method", () => {
    expect(resolveEndpointStatus(ep({}), root).resolvedStatus).toBe("implemented");
    expect(resolveEndpointStatus(ep({ method: "DELETE" }), root).resolvedStatus).toBe("planned");
    expect(resolveEndpointStatus(ep({ method: "PATCH", path: "/api/v1/projects/:id" }), root).resolvedStatus).toBe("planned");
    expect(resolveEndpointStatus(ep({ method: "POST", path: "/api/v1/forms/contact" }), root).resolvedStatus).toBe("implemented");
    expect(resolveEndpointStatus(ep({ path: "/api/v1/nope" }), root).resolvedStatus).toBe("planned");
  });

  it("never upgrades an endpoint the registry calls planned", () => {
    expect(resolveEndpointStatus(ep({ status: "planned" }), root).resolvedStatus).toBe("planned");
  });

  it("has unique ids and resolves against the real repository", () => {
    const ids = new Set(API_ENDPOINTS.map((e) => e.id));
    expect(ids.size).toBe(API_ENDPOINTS.length);
    const resolved = resolveAllEndpoints();
    const search = resolved.find((e) => e.id === "search");
    expect(search?.resolvedStatus).toBe("implemented");
    expect(resolved.find((e) => e.id === "api-tokens")?.resolvedStatus).toBe("planned");
    for (const e of resolved) {
      if (e.resolvedStatus === "implemented") expect(fs.existsSync(path.join(process.cwd(), e.routeFile)), e.routeFile).toBe(true);
    }
  });
});
