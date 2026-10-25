/**
 * Route-level integration tests for the workspace API, against the real test database.
 * requireApiUser() is mocked so each request runs as a chosen user; everything below it
 * (access checks, services, DB) is exercised for real.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

let currentUser: User | null = null;
vi.mock("@/lib/auth/guards", async (orig) => {
  const mod = await orig<typeof import("@/lib/auth/guards")>();
  return {
    ...mod,
    requireApiUser: async () => {
      if (!currentUser) throw new mod.AuthError();
      return currentUser;
    },
  };
});

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, workspaces, type User, type Workspace } from "@/db/schema";
import { createUserWithWorkspace } from "@/lib/auth/users";
import { PLANS } from "@/config/plans";
import { decryptSecret } from "@/lib/crypto";
import { projectEnvVars } from "@/db/schema";
import * as workspacesRoute from "@/app/api/v1/workspaces/route";
import * as workspaceRoute from "@/app/api/v1/workspaces/[id]/route";
import * as projectsRoute from "@/app/api/v1/projects/route";
import * as projectRoute from "@/app/api/v1/projects/[id]/route";
import * as filesRoute from "@/app/api/v1/projects/[id]/files/route";
import * as contentRoute from "@/app/api/v1/projects/[id]/files/content/route";
import * as renameRoute from "@/app/api/v1/projects/[id]/files/rename/route";
import * as searchRoute from "@/app/api/v1/projects/[id]/search/route";
import * as snapshotsRoute from "@/app/api/v1/projects/[id]/snapshots/route";
import * as snapshotRoute from "@/app/api/v1/projects/[id]/snapshots/[sid]/route";
import * as restoreRoute from "@/app/api/v1/projects/[id]/snapshots/[sid]/restore/route";
import * as changesRoute from "@/app/api/v1/projects/[id]/changes/route";
import * as activityRoute from "@/app/api/v1/projects/[id]/activity/route";
import * as envRoute from "@/app/api/v1/projects/[id]/env/route";
import * as shareRoute from "@/app/api/v1/projects/[id]/share/route";
import * as shareLinkRoute from "@/app/api/v1/projects/[id]/share/[linkId]/route";
import * as duplicateRoute from "@/app/api/v1/projects/[id]/duplicate/route";
import * as onboardingRoute from "@/app/api/v1/account/onboarding/route";
import { resolveShareToken } from "@/lib/services/share-links";

const suffix = Date.now().toString(36);
let alice: User;
let aliceWs: Workspace;
let bob: User;
let bobWs: Workspace;

const B = "http://test.local/api/v1";
const ctx = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const req = (method: string, path: string, body?: unknown) =>
  new Request(`${B}${path}`, { method, headers: body !== undefined ? { "Content-Type": "application/json" } : {}, body: body !== undefined ? JSON.stringify(body) : undefined });
const as = (u: User) => {
  currentUser = u;
};
async function readJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

beforeAll(async () => {
  ({ user: alice, workspace: aliceWs } = await createUserWithWorkspace({ email: `alice-${suffix}@test.local`, name: "Alice" }));
  ({ user: bob, workspace: bobWs } = await createUserWithWorkspace({ email: `bob-${suffix}@test.local`, name: "Bob" }));
});

afterAll(async () => {
  for (const ws of [aliceWs, bobWs]) if (ws) await db.delete(workspaces).where(eq(workspaces.id, ws.id));
  for (const u of [alice, bob]) if (u) await db.delete(users).where(eq(users.id, u.id));
});

describe("workspaces", () => {
  it("lists only the caller's workspaces and returns detail with members", async () => {
    as(alice);
    const list = await readJson(await workspacesRoute.GET(req("GET", "/workspaces"), undefined));
    expect(list.workspaces.map((w: { workspace: { id: string } }) => w.workspace.id)).toEqual([aliceWs.id]);
    expect(list.workspaces[0].role).toBe("owner");

    const detail = await readJson(await workspaceRoute.GET(req("GET", `/workspaces/${aliceWs.id}`), ctx({ id: aliceWs.id })));
    expect(detail.workspace.id).toBe(aliceWs.id);
    expect(detail.members).toHaveLength(1);
    expect(detail.members[0].email).toBe(alice.email);

    as(bob);
    const denied = await workspaceRoute.GET(req("GET", `/workspaces/${aliceWs.id}`), ctx({ id: aliceWs.id }));
    expect(denied.status).toBe(404);
  });

  it("creates a workspace and validates the name", async () => {
    as(alice);
    const bad = await workspacesRoute.POST(req("POST", "/workspaces", { name: "x" }), undefined);
    expect(bad.status).toBe(400);
    const res = await workspacesRoute.POST(req("POST", "/workspaces", { name: `Team ${suffix}` }), undefined);
    expect(res.status).toBe(201);
    const { workspace } = await readJson(res);
    expect(workspace.role).toBe("owner");
    await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
  });

  it("rejects unauthenticated requests", async () => {
    currentUser = null;
    expect((await workspacesRoute.GET(req("GET", "/workspaces"), undefined)).status).toBe(401);
  });
});

describe("projects, files, snapshots and access control", () => {
  let projectId: string;

  it("creates a project from a template with files, an initial snapshot and activity", async () => {
    as(alice);
    const res = await projectsRoute.POST(req("POST", "/projects", { workspaceId: aliceWs.id, name: "Alpha", templateId: "vite-react-starter" }), undefined);
    expect(res.status).toBe(201);
    const { project } = await readJson(res);
    projectId = project.id;
    expect(project.framework).toBe("vite-react");

    const files = await readJson(await filesRoute.GET(req("GET", `/projects/${projectId}/files`), ctx({ id: projectId })));
    expect(files.files.length).toBeGreaterThan(3);
    expect(files.files.some((f: { path: string }) => f.path === "package.json")).toBe(true);

    const snaps = await readJson(await snapshotsRoute.GET(req("GET", `/projects/${projectId}/snapshots`), ctx({ id: projectId })));
    expect(snaps.snapshots).toHaveLength(1);
    expect(snaps.snapshots[0].kind).toBe("auto");

    const act = await readJson(await activityRoute.GET(req("GET", `/projects/${projectId}/activity`), ctx({ id: projectId })));
    expect(act.activity[0].kind).toBe("project.created");
    expect(act.activity[0].actorName).toBe("Alice");
  });

  it("rejects unknown templates and missing fields", async () => {
    as(alice);
    expect((await projectsRoute.POST(req("POST", "/projects", { workspaceId: aliceWs.id, name: "X", templateId: "nope" }), undefined)).status).toBe(400);
    expect((await projectsRoute.POST(req("POST", "/projects", { workspaceId: aliceWs.id, templateId: "vite-react-starter" }), undefined)).status).toBe(400);
    expect((await projectsRoute.GET(req("GET", "/projects"), undefined)).status).toBe(400);
  });

  it("user B cannot read, list, write or delete user A's project (404, no existence leak)", async () => {
    as(bob);
    expect((await projectRoute.GET(req("GET", `/projects/${projectId}`), ctx({ id: projectId }))).status).toBe(404);
    expect((await projectsRoute.GET(req("GET", `/projects?workspaceId=${aliceWs.id}`), undefined)).status).toBe(404);
    expect((await filesRoute.GET(req("GET", `/projects/${projectId}/files`), ctx({ id: projectId }))).status).toBe(404);
    expect((await contentRoute.PUT(req("PUT", `/projects/${projectId}/files/content`, { path: "x.ts", content: "evil" }), ctx({ id: projectId }))).status).toBe(404);
    expect((await projectRoute.DELETE(req("DELETE", `/projects/${projectId}`), ctx({ id: projectId }))).status).toBe(404);
    expect((await envRoute.GET(req("GET", `/projects/${projectId}/env?reveal=1`), ctx({ id: projectId }))).status).toBe(404);
    expect((await projectsRoute.POST(req("POST", "/projects", { workspaceId: aliceWs.id, name: "Intruder", templateId: "vite-react-starter" }), undefined)).status).toBe(404);
  });

  it("writes, reads, searches, renames and deletes files (and folders)", async () => {
    as(alice);
    const put = await contentRoute.PUT(req("PUT", `/projects/${projectId}/files/content`, { path: "/src/lib//util.ts", content: "export const answer = 42;\n" }), ctx({ id: projectId }));
    expect(put.status).toBe(200);
    expect((await readJson(put)).file).toMatchObject({ path: "src/lib/util.ts", created: true });

    const read = await readJson(await contentRoute.GET(req("GET", `/projects/${projectId}/files/content?path=src/lib/util.ts`), ctx({ id: projectId })));
    expect(read.content).toBe("export const answer = 42;\n");

    const traversal = await contentRoute.PUT(req("PUT", `/projects/${projectId}/files/content`, { path: "../escape.ts", content: "" }), ctx({ id: projectId }));
    expect(traversal.status).toBe(400);

    const search = await readJson(await searchRoute.GET(req("GET", `/projects/${projectId}/search?q=answer%20=`), ctx({ id: projectId })));
    expect(search.results).toEqual([{ path: "src/lib/util.ts", line: 1, text: "export const answer = 42;" }]);

    const rename = await renameRoute.POST(req("POST", `/projects/${projectId}/files/rename`, { from: "src/lib/util.ts", to: "src/lib/answer.ts" }), ctx({ id: projectId }));
    expect(rename.status).toBe(200);
    expect((await contentRoute.GET(req("GET", `/projects/${projectId}/files/content?path=src/lib/util.ts`), ctx({ id: projectId }))).status).toBe(404);

    const clash = await renameRoute.POST(req("POST", `/projects/${projectId}/files/rename`, { from: "src/lib/answer.ts", to: "package.json" }), ctx({ id: projectId }));
    expect(clash.status).toBe(409);

    const folder = await renameRoute.POST(req("POST", `/projects/${projectId}/files/rename`, { from: "src/lib", to: "src/helpers", isFolder: true }), ctx({ id: projectId }));
    expect((await readJson(folder)).count).toBe(1);
    const into = await renameRoute.POST(req("POST", `/projects/${projectId}/files/rename`, { from: "src", to: "src/inner", isFolder: true }), ctx({ id: projectId }));
    expect(into.status).toBe(400);

    const del = await filesRoute.DELETE(req("DELETE", `/projects/${projectId}/files?path=src/helpers&folder=1`), ctx({ id: projectId }));
    expect((await readJson(del)).deleted).toBe(1);
    expect((await filesRoute.DELETE(req("DELETE", `/projects/${projectId}/files?path=src/helpers/answer.ts`), ctx({ id: projectId }))).status).toBe(404);
  });

  it("creates a snapshot, diffs it against current files, reports changes and restores", async () => {
    as(alice);
    await contentRoute.PUT(req("PUT", `/projects/${projectId}/files/content`, { path: "notes.md", content: "v1" }), ctx({ id: projectId }));
    const created = await snapshotsRoute.POST(req("POST", `/projects/${projectId}/snapshots`, { name: "Checkpoint" }), ctx({ id: projectId }));
    expect(created.status).toBe(201);
    const sid = (await readJson(created)).snapshot.id as string;

    let changes = await readJson(await changesRoute.GET(req("GET", `/projects/${projectId}/changes`), ctx({ id: projectId })));
    expect(changes.snapshot.id).toBe(sid);
    expect(changes.changes).toEqual([]);

    await contentRoute.PUT(req("PUT", `/projects/${projectId}/files/content`, { path: "notes.md", content: "v2" }), ctx({ id: projectId }));
    await contentRoute.PUT(req("PUT", `/projects/${projectId}/files/content`, { path: "extra.txt", content: "x" }), ctx({ id: projectId }));
    await filesRoute.DELETE(req("DELETE", `/projects/${projectId}/files?path=package.json`), ctx({ id: projectId }));

    changes = await readJson(await changesRoute.GET(req("GET", `/projects/${projectId}/changes`), ctx({ id: projectId })));
    expect(changes.changes).toEqual([
      { path: "extra.txt", action: "create" },
      { path: "notes.md", action: "update" },
      { path: "package.json", action: "delete" },
    ]);

    const detail = await readJson(await snapshotRoute.GET(req("GET", `/projects/${projectId}/snapshots/${sid}`), ctx({ id: projectId, sid })));
    expect(detail.snapshot.name).toBe("Checkpoint");
    expect(detail.diff.find((d: { path: string }) => d.path === "notes.md")).toMatchObject({ action: "update", before: "v1", after: "v2" });

    const restored = await restoreRoute.POST(req("POST", `/projects/${projectId}/snapshots/${sid}/restore`), ctx({ id: projectId, sid }));
    expect(restored.status).toBe(200);
    const notes = await readJson(await contentRoute.GET(req("GET", `/projects/${projectId}/files/content?path=notes.md`), ctx({ id: projectId })));
    expect(notes.content).toBe("v1");
    expect((await contentRoute.GET(req("GET", `/projects/${projectId}/files/content?path=extra.txt`), ctx({ id: projectId }))).status).toBe(404);
    expect((await contentRoute.GET(req("GET", `/projects/${projectId}/files/content?path=package.json`), ctx({ id: projectId }))).status).toBe(200);

    const snaps = await readJson(await snapshotsRoute.GET(req("GET", `/projects/${projectId}/snapshots`), ctx({ id: projectId })));
    expect(snaps.snapshots[0].kind).toBe("restore"); // safety snapshot taken before restoring
    expect((await snapshotRoute.GET(req("GET", `/projects/${projectId}/snapshots/nope`), ctx({ id: projectId, sid: "nope" }))).status).toBe(404);
  });

  it("stores env vars encrypted and masks them unless revealed by an editor", async () => {
    as(alice);
    const put = await envRoute.PUT(req("PUT", `/projects/${projectId}/env`, { key: "API_KEY", value: "s3cret" }), ctx({ id: projectId }));
    expect(put.status).toBe(200);
    expect((await readJson(put)).vars[0].value).toBe("••••");
    expect((await envRoute.PUT(req("PUT", `/projects/${projectId}/env`, { key: "1BAD", value: "x" }), ctx({ id: projectId }))).status).toBe(400);

    const [row] = await db.select().from(projectEnvVars).where(eq(projectEnvVars.projectId, projectId));
    expect(row.valueEnc).not.toContain("s3cret");
    expect(decryptSecret(row.valueEnc)).toBe("s3cret");

    const masked = await readJson(await envRoute.GET(req("GET", `/projects/${projectId}/env`), ctx({ id: projectId })));
    expect(masked.vars).toEqual([expect.objectContaining({ key: "API_KEY", value: "••••" })]);
    const revealed = await readJson(await envRoute.GET(req("GET", `/projects/${projectId}/env?reveal=1`), ctx({ id: projectId })));
    expect(revealed.vars[0].value).toBe("s3cret");

    expect((await envRoute.DELETE(req("DELETE", `/projects/${projectId}/env?key=API_KEY`), ctx({ id: projectId }))).status).toBe(204);
    expect((await envRoute.DELETE(req("DELETE", `/projects/${projectId}/env?key=API_KEY`), ctx({ id: projectId }))).status).toBe(404);
  });

  it("creates share links as absolute /share/<token> URLs and revokes them", async () => {
    as(alice);
    const res = await shareRoute.POST(req("POST", `/projects/${projectId}/share`, { access: "view", expiresInDays: 7 }), ctx({ id: projectId }));
    expect(res.status).toBe(201);
    const { url, link } = await readJson(res);
    expect(url).toMatch(/^https?:\/\/[^/]+\/share\/[A-Za-z0-9_-]+$/);
    const token = url.split("/share/")[1];
    expect((await resolveShareToken(token))?.project.id).toBe(projectId);

    const list = await readJson(await shareRoute.GET(req("GET", `/projects/${projectId}/share`), ctx({ id: projectId })));
    expect(list.links.map((l: { id: string }) => l.id)).toContain(link.id);
    expect(JSON.stringify(list)).not.toContain(token);

    expect((await shareLinkRoute.DELETE(req("DELETE", `/projects/${projectId}/share/${link.id}`), ctx({ id: projectId, linkId: link.id }))).status).toBe(204);
    expect(await resolveShareToken(token)).toBeNull();
    expect((await shareLinkRoute.DELETE(req("DELETE", `/projects/${projectId}/share/${link.id}`), ctx({ id: projectId, linkId: link.id }))).status).toBe(404);
  });

  it("patches name/visibility/settings and soft-deletes", async () => {
    as(alice);
    const patched = await readJson(await projectRoute.PATCH(req("PATCH", `/projects/${projectId}`, { name: "Alpha 2", visibility: "unlisted", settings: { port: 4321 } }), ctx({ id: projectId })));
    expect(patched.project).toMatchObject({ name: "Alpha 2", visibility: "unlisted" });
    expect(patched.project.settings.port).toBe(4321);
    expect(patched.project.settings.devCommand).toBe("npm run dev"); // merged, not replaced
    expect((await projectRoute.PATCH(req("PATCH", `/projects/${projectId}`, {}), ctx({ id: projectId }))).status).toBe(400);

    const dup = await duplicateRoute.POST(req("POST", `/projects/${projectId}/duplicate`), ctx({ id: projectId }));
    expect(dup.status).toBe(201);
    const copy = (await readJson(dup)).project;
    expect(copy.name).toBe("Alpha 2 (copy)");
    expect((await projectRoute.DELETE(req("DELETE", `/projects/${copy.id}`), ctx({ id: copy.id }))).status).toBe(204);

    expect((await projectRoute.DELETE(req("DELETE", `/projects/${projectId}`), ctx({ id: projectId }))).status).toBe(204);
    expect((await projectRoute.GET(req("GET", `/projects/${projectId}`), ctx({ id: projectId }))).status).toBe(404);
    const list = await readJson(await projectsRoute.GET(req("GET", `/projects?workspaceId=${aliceWs.id}`), undefined));
    expect(list.projects).toEqual([]);
  });
});

describe("plan quota", () => {
  it("returns 402 quota_exceeded once the free plan project limit is reached", async () => {
    as(bob);
    const limit = PLANS.free.limits.projects;
    const ids: string[] = [];
    for (let i = 0; i < limit; i++) {
      const res = await projectsRoute.POST(req("POST", "/projects", { workspaceId: bobWs.id, name: `Q${i}`, templateId: "static-site" }), undefined);
      expect(res.status).toBe(201);
      ids.push((await readJson(res)).project.id);
    }
    const over = await projectsRoute.POST(req("POST", "/projects", { workspaceId: bobWs.id, name: "Over", templateId: "static-site" }), undefined);
    expect(over.status).toBe(402);
    const body = await readJson(over);
    expect(body.error.code).toBe("quota_exceeded");
    expect(body.error.details).toMatchObject({ kind: "projects", used: limit, limit });
    expect((await duplicateRoute.POST(req("POST", `/projects/${ids[0]}/duplicate`), ctx({ id: ids[0] }))).status).toBe(402);

    // Soft-deleting one frees a slot.
    await projectRoute.DELETE(req("DELETE", `/projects/${ids[0]}`), ctx({ id: ids[0] }));
    const again = await projectsRoute.POST(req("POST", "/projects", { workspaceId: bobWs.id, name: "Again", templateId: "static-site" }), undefined);
    expect(again.status).toBe(201);
  });
});

describe("onboarding", () => {
  it("updates profile fields and marks onboarding complete once", async () => {
    as(bob);
    const bad = await onboardingRoute.PATCH(req("PATCH", "/account/onboarding", { timezone: "Mars/Olympus" }), undefined);
    expect(bad.status).toBe(400);
    const res = await readJson(await onboardingRoute.PATCH(req("PATCH", "/account/onboarding", { name: "Bobby", timezone: "Asia/Kolkata", locale: "en-IN", completed: true }), undefined));
    expect(res.user).toMatchObject({ name: "Bobby", timezone: "Asia/Kolkata", locale: "en-IN" });
    expect(res.user.onboardedAt).toBeTruthy();
  });
});
