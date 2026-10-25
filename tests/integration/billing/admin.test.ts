/** Admin API authorization and a few mutations (plan override, feature flags, user suspension). */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

let currentUser: User | null = null;
vi.mock("@/lib/auth/guards", async (orig) => {
  const mod = await orig<typeof import("@/lib/auth/guards")>();
  const requireApiUser = async () => { if (!currentUser) throw new mod.AuthError(); return currentUser; };
  const requireApiAdmin = async () => {
    const u = await requireApiUser();
    if (u.role !== "admin" && u.role !== "staff") throw new mod.AuthError("Forbidden", 403);
    return u;
  };
  return { ...mod, requireApiUser, requireApiAdmin };
});

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { featureFlags, sessions, subscriptions, users, workspaces, type User, type Workspace } from "@/db/schema";
import { createUserWithWorkspace } from "@/lib/auth/users";
import { createSession } from "@/lib/auth/session";
import { getEffectivePlan } from "@/lib/services/usage";
import { isFlagEnabled } from "@/lib/billing/flags";
import * as overviewRoute from "@/app/api/v1/admin/overview/route";
import * as usersRoute from "@/app/api/v1/admin/users/route";
import * as userRoute from "@/app/api/v1/admin/users/[id]/route";
import * as wsRoute from "@/app/api/v1/admin/workspaces/[id]/route";
import * as flagsRoute from "@/app/api/v1/admin/feature-flags/route";
import * as flagRoute from "@/app/api/v1/admin/feature-flags/[key]/route";
import * as auditRoute from "@/app/api/v1/admin/audit-logs/route";

const suffix = Date.now().toString(36);
const B = "http://test.local/api/v1/admin";
const ctx = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const req = (method: string, path: string, body?: unknown) =>
  new Request(`${B}${path}`, { method, headers: body !== undefined ? { "Content-Type": "application/json" } : {}, body: body !== undefined ? JSON.stringify(body) : undefined });

let plain: User, plainWs: Workspace, staff: User, staffWs: Workspace, admin: User, adminWs: Workspace;
const flagKey = `test.flag.${suffix}`;

beforeAll(async () => {
  const p = await createUserWithWorkspace({ email: `plain-${suffix}@example.com`, password: "password123" });
  const s = await createUserWithWorkspace({ email: `staff-${suffix}@example.com`, password: "password123" });
  const a = await createUserWithWorkspace({ email: `admin-${suffix}@example.com`, password: "password123" });
  [plain, plainWs, staff, staffWs, admin, adminWs] = [p.user, p.workspace, s.user, s.workspace, a.user, a.workspace];
  [staff] = await db.update(users).set({ role: "staff" }).where(eq(users.id, staff.id)).returning();
  [admin] = await db.update(users).set({ role: "admin" }).where(eq(users.id, admin.id)).returning();
});

afterAll(async () => {
  await db.delete(featureFlags).where(eq(featureFlags.key, flagKey));
  await db.delete(subscriptions).where(eq(subscriptions.workspaceId, plainWs.id));
  for (const w of [plainWs, staffWs, adminWs]) await db.delete(workspaces).where(eq(workspaces.id, w.id));
  for (const u of [plain, staff, admin]) await db.delete(users).where(eq(users.id, u.id));
});

describe("admin authorization", () => {
  it("anonymous → 401, regular user → 403, staff and admin → 200", async () => {
    currentUser = null;
    expect((await overviewRoute.GET(req("GET", "/overview"), undefined)).status).toBe(401);
    currentUser = plain;
    expect((await overviewRoute.GET(req("GET", "/overview"), undefined)).status).toBe(403);
    expect((await usersRoute.GET(req("GET", "/users"), undefined)).status).toBe(403);
    expect((await auditRoute.GET(req("GET", "/audit-logs"), undefined)).status).toBe(403);
    expect((await flagsRoute.POST(req("POST", "/feature-flags", { key: flagKey }), undefined)).status).toBe(403);
    currentUser = staff;
    const ov = await overviewRoute.GET(req("GET", "/overview"), undefined);
    expect(ov.status).toBe(200);
    expect(await ov.json()).toMatchObject({ users: expect.any(Number), jobs: expect.any(Object) });
    currentUser = admin;
    expect((await usersRoute.GET(req("GET", `/users?q=${suffix}`), undefined)).status).toBe(200);
  });

  it("staff cannot change roles; admins can; nobody can demote themselves", async () => {
    currentUser = staff;
    expect((await userRoute.PATCH(req("PATCH", `/users/${plain.id}`, { role: "staff" }), ctx({ id: plain.id }))).status).toBe(403);
    currentUser = admin;
    expect((await userRoute.PATCH(req("PATCH", `/users/${admin.id}`, { role: "user" }), ctx({ id: admin.id }))).status).toBe(400);
    const ok = await userRoute.PATCH(req("PATCH", `/users/${plain.id}`, { role: "staff" }), ctx({ id: plain.id }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).user.role).toBe("staff");
    await db.update(users).set({ role: "user" }).where(eq(users.id, plain.id));
  });

  it("suspending a user purges their sessions; restoring clears deletedAt", async () => {
    await createSession(plain.id);
    currentUser = staff;
    const s = await userRoute.PATCH(req("PATCH", `/users/${plain.id}`, { suspended: true }), ctx({ id: plain.id }));
    expect(s.status).toBe(200);
    expect((await s.json()).user.deletedAt).not.toBeNull();
    expect(await db.select().from(sessions).where(eq(sessions.userId, plain.id))).toHaveLength(0);
    const r = await userRoute.PATCH(req("PATCH", `/users/${plain.id}`, { suspended: false }), ctx({ id: plain.id }));
    expect((await r.json()).user.deletedAt).toBeNull();
  });

  it("manual plan override creates a manual subscription that getEffectivePlan honours", async () => {
    currentUser = staff;
    const end = new Date(Date.now() + 10 * 86400_000).toISOString();
    const res = await wsRoute.PATCH(req("PATCH", `/workspaces/${plainWs.id}`, { plan: "team", periodEnd: end, note: "trial" }), ctx({ id: plainWs.id }));
    expect(res.status).toBe(200);
    expect((await res.json()).plan).toBe("team");
    const [w] = await db.select().from(workspaces).where(eq(workspaces.id, plainWs.id));
    expect(w.plan).toBe("team");
    expect(await getEffectivePlan(w)).toBe("team");
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.workspaceId, plainWs.id));
    expect(sub).toMatchObject({ provider: "manual", plan: "team", status: "active" });
    const back = await wsRoute.PATCH(req("PATCH", `/workspaces/${plainWs.id}`, { plan: "free" }), ctx({ id: plainWs.id }));
    expect((await back.json()).plan).toBe("free");
    expect(await getEffectivePlan((await db.select().from(workspaces).where(eq(workspaces.id, plainWs.id)))[0])).toBe("free");
    expect((await wsRoute.PATCH(req("PATCH", `/workspaces/nope`, { plan: "pro" }), ctx({ id: "nope" }))).status).toBe(404);
  });

  it("feature flags: create, toggle, read via isFlagEnabled, delete", async () => {
    currentUser = staff;
    expect(await isFlagEnabled(flagKey, { fresh: true })).toBe(false);
    expect((await flagsRoute.POST(req("POST", "/feature-flags", { key: "Bad Key!" }), undefined)).status).toBe(400);
    const created = await flagsRoute.POST(req("POST", "/feature-flags", { key: flagKey, description: "test", enabled: true }), undefined);
    expect(created.status).toBe(201);
    expect(await isFlagEnabled(flagKey, { fresh: true })).toBe(true);
    const off = await flagRoute.PATCH(req("PATCH", `/feature-flags/${flagKey}`, { enabled: false }), ctx({ key: flagKey }));
    expect((await off.json()).flag.enabled).toBe(false);
    expect(await isFlagEnabled(flagKey)).toBe(false); // cache invalidated on write
    const list = await flagsRoute.GET(req("GET", "/feature-flags"), undefined);
    expect((await list.json()).flags.some((f: { key: string }) => f.key === flagKey)).toBe(true);
    expect((await flagRoute.DELETE(req("DELETE", `/feature-flags/${flagKey}`), ctx({ key: flagKey }))).status).toBe(200);
    expect((await flagRoute.DELETE(req("DELETE", `/feature-flags/${flagKey}`), ctx({ key: flagKey }))).status).toBe(404);
  });
});
