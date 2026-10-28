/**
 * Codexa Cloud against the real test database: the public app API (bearer auth, CORS, access
 * rules for private / public_read / public, limits) and the Codexa-internal panel routes
 * (enable writes the SDK file, status, access changes, users). requireApiUser() is mocked.
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

import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { appRecords, appSessions, appUsers, projects, users, workspaceMembers, workspaces, type User, type Workspace } from "@/db/schema";
import { createUserWithWorkspace } from "@/lib/auth/users";
import { createProject, readFile } from "@/lib/services/projects";
import { CLOUD_LIMITS } from "@/lib/services/cloud";
import { cloudPromptSection } from "@/lib/ai/cloud-docs";
import * as cloudRoute from "@/app/api/v1/projects/[id]/cloud/route";
import * as collectionAdminRoute from "@/app/api/v1/projects/[id]/cloud/collections/[name]/route";
import * as recordAdminRoute from "@/app/api/v1/projects/[id]/cloud/collections/[name]/records/[recordId]/route";
import * as usersAdminRoute from "@/app/api/v1/projects/[id]/cloud/users/route";
import * as userAdminRoute from "@/app/api/v1/projects/[id]/cloud/users/[userId]/route";
import * as signupRoute from "@/app/api/apps/[projectId]/auth/signup/route";
import * as signinRoute from "@/app/api/apps/[projectId]/auth/signin/route";
import * as signoutRoute from "@/app/api/apps/[projectId]/auth/signout/route";
import * as meRoute from "@/app/api/apps/[projectId]/auth/me/route";
import * as collectionRoute from "@/app/api/apps/[projectId]/collections/[name]/route";
import * as recordRoute from "@/app/api/apps/[projectId]/collections/[name]/[id]/route";

const suffix = Date.now().toString(36);
let owner: User;
let ownerWs: Workspace;
let viewer: User;
let viewerWs: Workspace;
let outsider: User;
let outsiderWs: Workspace;
let projectId: string;
let staticProjectId: string;

const ctx = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const as = (u: User | null) => {
  currentUser = u;
};
const read = async (res: Response) => {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
};
let ipSeq = 0;
/** Each public call comes from a fresh IP unless one is given, so the sign-in limit only bites where tested. */
function appReq(method: string, path: string, opts: { body?: unknown; token?: string | null; ip?: string; origin?: string } = {}) {
  const headers: Record<string, string> = { "x-forwarded-for": opts.ip ?? `10.0.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}` };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  headers.Origin = opts.origin ?? "https://my-app.sites.example";
  return new Request(`http://test.local/api/apps/${projectId}${path}`, { method, headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
}
const adminReq = (method: string, path: string, body?: unknown) =>
  new Request(`http://test.local/api/v1/projects/${projectId}/cloud${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

async function signUp(email: string, pid = projectId) {
  const res = await signupRoute.POST(appReq("POST", "/auth/signup", { body: { email, password: "correct-horse", name: email.split("@")[0] } }), ctx({ projectId: pid }));
  const body = await read(res);
  return { res, body, token: body?.data?.token as string, user: body?.data?.user as { id: string; email: string } };
}
const list = (name: string, token?: string | null, query = "") => collectionRoute.GET(appReq("GET", `/collections/${name}${query}`, { token }), ctx({ projectId, name }));
const add = (name: string, data: unknown, token?: string | null) => collectionRoute.POST(appReq("POST", `/collections/${name}`, { body: data, token }), ctx({ projectId, name }));
const setAccess = async (name: string, access: string) => {
  as(owner);
  const res = await collectionAdminRoute.PATCH(adminReq("PATCH", `/collections/${name}`, { access }), ctx({ id: projectId, name }));
  expect(res.status).toBe(200);
};

let alice: { token: string; user: { id: string; email: string } };
let bob: { token: string; user: { id: string; email: string } };

beforeAll(async () => {
  ({ user: owner, workspace: ownerWs } = await createUserWithWorkspace({ email: `cloud-o-${suffix}@test.local`, name: "Owner" }));
  ({ user: viewer, workspace: viewerWs } = await createUserWithWorkspace({ email: `cloud-v-${suffix}@test.local`, name: "Viewer" }));
  ({ user: outsider, workspace: outsiderWs } = await createUserWithWorkspace({ email: `cloud-x-${suffix}@test.local`, name: "Outsider" }));
  await db.insert(workspaceMembers).values({ workspaceId: ownerWs.id, userId: viewer.id, role: "viewer" });
  projectId = (await createProject({ workspaceId: ownerWs.id, createdBy: owner.id, name: `Cloud ${suffix}`, templateId: "vite-react-starter" })).id;
  staticProjectId = (await createProject({ workspaceId: ownerWs.id, createdBy: owner.id, name: `Cloud static ${suffix}`, templateId: "static-site" })).id;
});

afterAll(async () => {
  for (const id of [projectId, staticProjectId]) if (id) await db.delete(projects).where(eq(projects.id, id));
  for (const ws of [ownerWs, viewerWs, outsiderWs]) if (ws) await db.delete(workspaces).where(eq(workspaces.id, ws.id));
  for (const u of [owner, viewer, outsider]) if (u) await db.delete(users).where(eq(users.id, u.id));
});

describe("before Cloud is enabled", () => {
  it("answers 404 on the app API, with CORS headers", async () => {
    const res = await signupRoute.POST(appReq("POST", "/auth/signup", { body: { email: "x@example.com", password: "password123" } }), ctx({ projectId }));
    expect(res.status).toBe(404);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect((await read(res)).error.code).toBe("not_found");
  });

  it("reports status as off to viewers and keeps outsiders out", async () => {
    as(viewer);
    const res = await cloudRoute.GET(adminReq("GET", ""), ctx({ id: projectId }));
    expect(res.status).toBe(200);
    const body = await read(res);
    expect(body.enabled).toBe(false);
    expect(body.canEdit).toBe(false);
    expect(body.apiBase).toMatch(new RegExp(`/api/apps/${projectId}$`));
    as(outsider);
    expect([403, 404]).toContain((await cloudRoute.GET(adminReq("GET", ""), ctx({ id: projectId }))).status);
  });

  it("only lets editors turn it on", async () => {
    as(viewer);
    expect((await cloudRoute.POST(adminReq("POST", ""), ctx({ id: projectId }))).status).toBe(403);
    as(null);
    expect((await cloudRoute.POST(adminReq("POST", ""), ctx({ id: projectId }))).status).toBe(401);
  });
});

describe("enabling", () => {
  it("writes the typed SDK with the project's API base and sets the flag", async () => {
    as(owner);
    const res = await cloudRoute.POST(adminReq("POST", ""), ctx({ id: projectId }));
    expect(res.status).toBe(200);
    const body = await read(res);
    expect(body.enabled).toBe(true);
    expect(body.sdkPath).toBe("src/lib/codexa.ts");
    const file = await readFile(projectId, "src/lib/codexa.ts");
    expect(file?.content).toContain(`/api/apps/${projectId}`);
    expect(file?.content).toContain("export const auth");
    expect(file?.content).toContain("export const db");
    expect(file?.content).toContain("export type CloudUser");
    const [p] = await db.select().from(projects).where(eq(projects.id, projectId));
    expect(p.settings.cloudEnabled).toBe(true);
  });

  it("writes codexa.js as an ES module for static sites", async () => {
    as(owner);
    const res = await cloudRoute.POST(new Request(`http://test.local/api/v1/projects/${staticProjectId}/cloud`, { method: "POST" }), ctx({ id: staticProjectId }));
    expect(res.status).toBe(200);
    const file = await readFile(staticProjectId, "codexa.js");
    expect(file?.content).toContain(`/api/apps/${staticProjectId}`);
    expect(file?.content).toMatch(/export const auth/);
    expect(file?.content).not.toMatch(/: Promise</);
  });

  it("teaches the agent the SDK only when enabled", () => {
    expect(cloudPromptSection(false)).toBeNull();
    const s = cloudPromptSection(true)!;
    expect(s).toContain('import { auth, db } from "./lib/codexa"');
    expect(s).toMatch(/public_read/);
    expect(s).toMatch(/localStorage/);
  });
});

describe("CORS", () => {
  it("answers preflight with the allowed methods and headers", async () => {
    const res = await collectionRoute.OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-headers")).toMatch(/authorization/);
    expect(res.headers.get("access-control-allow-headers")).toMatch(/content-type/);
    expect(res.headers.get("access-control-allow-methods")).toMatch(/PATCH/);
  });

  it("accepts cross-origin writes (bearer auth, no cookies)", async () => {
    const res = await signupRoute.POST(appReq("POST", "/auth/signup", { body: { email: `cors-${suffix}@example.com`, password: "password123" }, origin: "https://elsewhere.example" }), ctx({ projectId }));
    expect(res.status).toBe(201);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});

describe("app auth", () => {
  it("signs up, never returns the password hash, and resolves the token", async () => {
    const a = await signUp(`Alice-${suffix}@Example.com`);
    expect(a.res.status).toBe(201);
    expect(a.user.email).toBe(`alice-${suffix}@example.com`);
    expect(JSON.stringify(a.body)).not.toMatch(/passwordHash|scrypt/);
    expect(a.token.length).toBeGreaterThan(30);
    const [session] = await db.select().from(appSessions).where(eq(appSessions.appUserId, a.user.id));
    expect(session.tokenHash).not.toBe(a.token);
    expect(session.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 24 * 3600_000);
    alice = { token: a.token, user: a.user };

    const me = await read(await meRoute.GET(appReq("GET", "/auth/me", { token: a.token }), ctx({ projectId })));
    expect(me.data.user.id).toBe(a.user.id);
    expect(me.data.user.passwordHash).toBeUndefined();

    const b = await signUp(`bob-${suffix}@example.com`);
    bob = { token: b.token, user: b.user };
  });

  it("rejects duplicate emails, short passwords and wrong passwords", async () => {
    expect((await signUp(`alice-${suffix}@example.com`)).res.status).toBe(409);
    const short = await signupRoute.POST(appReq("POST", "/auth/signup", { body: { email: `s-${suffix}@example.com`, password: "short" } }), ctx({ projectId }));
    expect(short.status).toBe(400);
    const wrong = await signinRoute.POST(appReq("POST", "/auth/signin", { body: { email: `alice-${suffix}@example.com`, password: "nope-nope" } }), ctx({ projectId }));
    expect(wrong.status).toBe(401);
    expect((await read(wrong)).error.code).toBe("invalid_credentials");
  });

  it("signs in and out", async () => {
    const res = await signinRoute.POST(appReq("POST", "/auth/signin", { body: { email: `ALICE-${suffix}@example.com`, password: "correct-horse" } }), ctx({ projectId }));
    expect(res.status).toBe(200);
    const { data } = await read(res);
    expect(data.user.id).toBe(alice.user.id);
    const [u] = await db.select().from(appUsers).where(eq(appUsers.id, alice.user.id));
    expect(u.lastSignInAt).not.toBeNull();

    expect((await signoutRoute.POST(appReq("POST", "/auth/signout", { token: data.token }), ctx({ projectId }))).status).toBe(200);
    const me = await read(await meRoute.GET(appReq("GET", "/auth/me", { token: data.token }), ctx({ projectId })));
    expect(me.data.user).toBeNull();
    // The original session still works.
    expect((await read(await meRoute.GET(appReq("GET", "/auth/me", { token: alice.token }), ctx({ projectId })))).data.user.id).toBe(alice.user.id);
  });

  it("does not accept a token from another project", async () => {
    const other = await signUp(`stat-${suffix}@example.com`, staticProjectId);
    expect(other.res.status).toBe(201);
    const me = await read(await meRoute.GET(appReq("GET", "/auth/me", { token: other.token }), ctx({ projectId })));
    expect(me.data.user).toBeNull();
  });

  it("rate-limits sign-in per IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await signinRoute.POST(appReq("POST", "/auth/signin", { body: { email: `nobody-${i}@example.com`, password: "whatever1" }, ip: "203.0.113.9" }), ctx({ projectId }));
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe("private collections (default)", () => {
  let aliceTodo: string;

  it("requires sign-in to write and auto-creates the collection as private", async () => {
    expect((await add("todos", { title: "anon" })).status).toBe(401);
    const res = await add("todos", { title: "Buy milk", done: false, id: "spoofed", ownerId: "spoofed" }, alice.token);
    expect(res.status).toBe(201);
    const { data } = await read(res);
    expect(data.title).toBe("Buy milk");
    expect(data.ownerId).toBe(alice.user.id);
    expect(data.id).not.toBe("spoofed");
    aliceTodo = data.id;
    as(owner);
    const status = await read(await cloudRoute.GET(adminReq("GET", ""), ctx({ id: projectId })));
    expect(status.collections.find((c: { name: string }) => c.name === "todos")).toMatchObject({ access: "private", records: 1 });
  });

  it("shows each user only their own records", async () => {
    await add("todos", { title: "Bob's", done: true }, bob.token);
    const mine = await read(await list("todos", alice.token));
    expect(mine.data.items.map((r: { title: string }) => r.title)).toEqual(["Buy milk"]);
    const bobs = await read(await list("todos", bob.token));
    expect(bobs.data.items.map((r: { title: string }) => r.title)).toEqual(["Bob's"]);
    expect((await list("todos", null)).status).toBe(401);
  });

  it("hides other users' records from get, update and delete", async () => {
    const get = (token: string | null) => recordRoute.GET(appReq("GET", `/collections/todos/${aliceTodo}`, { token }), ctx({ projectId, name: "todos", id: aliceTodo }));
    expect((await get(alice.token)).status).toBe(200);
    expect((await get(bob.token)).status).toBe(404);
    expect((await get(null)).status).toBe(401);
    const patch = await recordRoute.PATCH(appReq("PATCH", `/collections/todos/${aliceTodo}`, { body: { done: true }, token: bob.token }), ctx({ projectId, name: "todos", id: aliceTodo }));
    expect(patch.status).toBe(404);
    const del = await recordRoute.DELETE(appReq("DELETE", `/collections/todos/${aliceTodo}`, { token: bob.token }), ctx({ projectId, name: "todos", id: aliceTodo }));
    expect(del.status).toBe(404);
  });

  it("lets the owner update (shallow merge) and delete", async () => {
    const patch = await recordRoute.PATCH(appReq("PATCH", `/collections/todos/${aliceTodo}`, { body: { done: true }, token: alice.token }), ctx({ projectId, name: "todos", id: aliceTodo }));
    expect(patch.status).toBe(200);
    expect((await read(patch)).data).toMatchObject({ title: "Buy milk", done: true });
    const del = await recordRoute.DELETE(appReq("DELETE", `/collections/todos/${aliceTodo}`, { token: alice.token }), ctx({ projectId, name: "todos", id: aliceTodo }));
    expect(del.status).toBe(200);
    expect((await read(await list("todos", alice.token))).data.items).toEqual([]);
  });
});

describe("public_read collections", () => {
  let bobPost: string;
  it("lets anyone read but only signed-in users write their own", async () => {
    await setAccess("posts", "public_read");
    const created = await add("posts", { title: "Hello", published: true }, bob.token);
    expect(created.status).toBe(201);
    bobPost = (await read(created)).data.id;
    expect((await add("posts", { title: "anon" })).status).toBe(401);
    const anon = await read(await list("posts", null));
    expect(anon.data.items.map((r: { title: string }) => r.title)).toEqual(["Hello"]);
    const asAlice = await read(await list("posts", alice.token));
    expect(asAlice.data.items).toHaveLength(1);
  });

  it("refuses edits by anyone but the creator", async () => {
    const byAlice = await recordRoute.PATCH(appReq("PATCH", `/collections/posts/${bobPost}`, { body: { title: "hacked" }, token: alice.token }), ctx({ projectId, name: "posts", id: bobPost }));
    expect(byAlice.status).toBe(403);
    const anon = await recordRoute.DELETE(appReq("DELETE", `/collections/posts/${bobPost}`), ctx({ projectId, name: "posts", id: bobPost }));
    expect(anon.status).toBe(401);
  });
});

describe("public collections", () => {
  it("lets anonymous visitors read and create, but not edit or delete", async () => {
    await setAccess("guestbook", "public");
    const res = await add("guestbook", { message: "Hi!" });
    expect(res.status).toBe(201);
    const rec = (await read(res)).data;
    expect(rec.ownerId).toBeNull();
    expect((await read(await list("guestbook"))).data.items).toHaveLength(1);
    const patch = await recordRoute.PATCH(appReq("PATCH", `/collections/guestbook/${rec.id}`, { body: { message: "x" } }), ctx({ projectId, name: "guestbook", id: rec.id }));
    expect(patch.status).toBe(401);
    const byAlice = await recordRoute.DELETE(appReq("DELETE", `/collections/guestbook/${rec.id}`, { token: alice.token }), ctx({ projectId, name: "guestbook", id: rec.id }));
    expect(byAlice.status).toBe(403);
  });

  it("lets a signed-in creator edit their own entry", async () => {
    const rec = (await read(await add("guestbook", { message: "mine" }, alice.token))).data;
    expect(rec.ownerId).toBe(alice.user.id);
    const patch = await recordRoute.PATCH(appReq("PATCH", `/collections/guestbook/${rec.id}`, { body: { message: "edited" }, token: alice.token }), ctx({ projectId, name: "guestbook", id: rec.id }));
    expect((await read(patch)).data.message).toBe("edited");
  });
});

describe("listing", () => {
  it("returns newest first, paginates with a cursor and filters by equality", async () => {
    for (let i = 0; i < 5; i++) await add("notes", { n: i, even: i % 2 === 0, tag: i < 2 ? "a" : "b" }, alice.token);
    const page1 = (await read(await list("notes", alice.token, "?limit=2"))).data;
    expect(page1.items.map((r: { n: number }) => r.n)).toEqual([4, 3]);
    expect(page1.nextCursor).toBeTruthy();
    const page2 = (await read(await list("notes", alice.token, `?limit=2&cursor=${page1.nextCursor}`))).data;
    expect(page2.items.map((r: { n: number }) => r.n)).toEqual([2, 1]);
    const page3 = (await read(await list("notes", alice.token, `?limit=2&cursor=${page2.nextCursor}`))).data;
    expect(page3.items.map((r: { n: number }) => r.n)).toEqual([0]);
    expect(page3.nextCursor).toBeNull();

    const where = (w: unknown) => `?where=${encodeURIComponent(JSON.stringify(w))}`;
    expect((await read(await list("notes", alice.token, where({ even: true })))).data.items.map((r: { n: number }) => r.n)).toEqual([4, 2, 0]);
    expect((await read(await list("notes", alice.token, where({ tag: "a", n: 1 })))).data.items.map((r: { n: number }) => r.n)).toEqual([1]);
    expect((await read(await list("notes", alice.token, where({ n: "1" })))).data.items).toEqual([]);
  });

  it("validates limit, filters and names", async () => {
    expect((await list("notes", alice.token, "?limit=101")).status).toBe(400);
    expect((await list("notes", alice.token, `?where=${encodeURIComponent('{"a.b":1}')}`)).status).toBe(400);
    expect((await list("notes", alice.token, `?where=${encodeURIComponent('{"a":{"$gt":1}}')}`)).status).toBe(400);
    expect((await list("notes", alice.token, "?cursor=garbage")).status).toBe(400);
    expect((await add("Bad-Name", { a: 1 }, alice.token)).status).toBe(400);
    expect((await add("todos", [1, 2], alice.token)).status).toBe(400);
  });

  it("returns an empty list for a collection that does not exist yet", async () => {
    const res = await read(await list("nothing_here", null));
    expect(res.data).toEqual({ items: [], nextCursor: null });
  });
});

describe("limits", () => {
  it("rejects records over 64 KB", async () => {
    const res = await add("todos", { blob: "x".repeat(CLOUD_LIMITS.maxRecordBytes) }, alice.token);
    expect(res.status).toBe(413);
  });

  it("stops at the per-project record limit", async () => {
    const limits = CLOUD_LIMITS as unknown as { maxRecordsPerProject: number };
    const original = limits.maxRecordsPerProject;
    const [{ n }] = await db.select({ n: count() }).from(appRecords).where(eq(appRecords.projectId, projectId));
    limits.maxRecordsPerProject = n;
    try {
      const res = await add("todos", { title: "one too many" }, alice.token);
      expect(res.status).toBe(403);
      expect((await read(res)).error.code).toBe("limit_reached");
    } finally {
      limits.maxRecordsPerProject = original;
    }
  });
});

describe("panel routes", () => {
  it("lists and deletes records for project members only", async () => {
    as(viewer);
    const res = await collectionAdminRoute.GET(adminReq("GET", "/collections/notes?limit=100"), ctx({ id: projectId, name: "notes" }));
    expect(res.status).toBe(200);
    const { items } = await read(res);
    expect(items).toHaveLength(5);
    expect((await recordAdminRoute.DELETE(adminReq("DELETE", `/collections/notes/records/${items[0].id}`), ctx({ id: projectId, name: "notes", recordId: items[0].id }))).status).toBe(403);
    expect((await collectionAdminRoute.PATCH(adminReq("PATCH", "/collections/notes", { access: "public" }), ctx({ id: projectId, name: "notes" }))).status).toBe(403);
    as(outsider);
    expect([403, 404]).toContain((await collectionAdminRoute.GET(adminReq("GET", "/collections/notes"), ctx({ id: projectId, name: "notes" }))).status);
    as(owner);
    expect((await recordAdminRoute.DELETE(adminReq("DELETE", `/collections/notes/records/${items[0].id}`), ctx({ id: projectId, name: "notes", recordId: items[0].id }))).status).toBe(204);
    expect((await collectionAdminRoute.PATCH(adminReq("PATCH", "/collections/notes", { access: "everyone" }), ctx({ id: projectId, name: "notes" }))).status).toBe(400);
  });

  it("lists app users without password hashes and deletes them with their sessions and records", async () => {
    as(viewer);
    const res = await usersAdminRoute.GET(adminReq("GET", "/users?limit=100"), ctx({ id: projectId }));
    expect(res.status).toBe(200);
    const body = await read(res);
    expect(body.users.map((u: { email: string }) => u.email)).toContain(`alice-${suffix}@example.com`);
    expect(JSON.stringify(body)).not.toMatch(/passwordHash|scrypt/);
    expect((await userAdminRoute.DELETE(adminReq("DELETE", `/users/${alice.user.id}`), ctx({ id: projectId, userId: alice.user.id }))).status).toBe(403);

    as(owner);
    expect((await userAdminRoute.DELETE(adminReq("DELETE", `/users/${alice.user.id}`), ctx({ id: projectId, userId: alice.user.id }))).status).toBe(204);
    expect(await db.select().from(appRecords).where(eq(appRecords.ownerId, alice.user.id))).toEqual([]);
    expect(await db.select().from(appSessions).where(eq(appSessions.appUserId, alice.user.id))).toEqual([]);
    const me = await read(await meRoute.GET(appReq("GET", "/auth/me", { token: alice.token }), ctx({ projectId })));
    expect(me.data.user).toBeNull();
  });
});

describe("disabling", () => {
  it("turns the app API off (404) and keeps the data", async () => {
    as(owner);
    expect((await cloudRoute.DELETE(adminReq("DELETE", ""), ctx({ id: projectId }))).status).toBe(200);
    const res = await list("posts", null);
    expect(res.status).toBe(404);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const status = await read(await cloudRoute.GET(adminReq("GET", ""), ctx({ id: projectId })));
    expect(status.enabled).toBe(false);
    expect(status.counts.records).toBeGreaterThan(0);
    expect(status.counts.users).toBeGreaterThan(0);
  });

  it("answers 404 for a deleted project", async () => {
    as(owner);
    await cloudRoute.POST(adminReq("POST", ""), ctx({ id: projectId }));
    expect((await list("posts", null)).status).toBe(200);
    await db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, projectId));
    expect((await list("posts", null)).status).toBe(404);
    await db.update(projects).set({ deletedAt: null }).where(eq(projects.id, projectId));
  });
});
