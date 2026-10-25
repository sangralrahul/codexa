/** Account routes: profile, password/session revocation, export, and deletion anonymisation. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

let currentUser: User | null = null;
let currentSessionId: string | null = null;
vi.mock("@/lib/auth/guards", async (orig) => {
  const mod = await orig<typeof import("@/lib/auth/guards")>();
  return { ...mod, requireApiUser: async () => { if (!currentUser) throw new mod.AuthError(); return currentUser; } };
});
vi.mock("@/lib/auth/session", async (orig) => {
  const mod = await orig<typeof import("@/lib/auth/session")>();
  return { ...mod, getCurrentUser: async () => currentUser, getCurrentSessionId: async () => currentSessionId, clearSessionCookie: async () => undefined };
});

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, sessions, users, workspaceMembers, workspaces, type User, type Workspace } from "@/db/schema";
import { createUserWithWorkspace } from "@/lib/auth/users";
import { createSession } from "@/lib/auth/session";
import { hashToken, verifyPassword } from "@/lib/crypto";
import * as profileRoute from "@/app/api/v1/account/profile/route";
import * as passwordRoute from "@/app/api/v1/account/password/route";
import * as sessionsRoute from "@/app/api/v1/account/sessions/route";
import * as exportRoute from "@/app/api/v1/account/export/route";
import * as deleteRoute from "@/app/api/v1/account/delete/route";

const suffix = Date.now().toString(36);
const req = (method: string, body?: unknown) => new Request(`http://test.local/api/v1/account/x`, { method, headers: body !== undefined ? { "Content-Type": "application/json" } : {}, body: body !== undefined ? JSON.stringify(body) : undefined });

let alice: User, aliceWs: Workspace, dave: User, daveWs: Workspace, sharedWs: Workspace;

beforeAll(async () => {
  const a = await createUserWithWorkspace({ email: `alice-${suffix}@example.com`, password: "password123", name: "Alice" });
  const d = await createUserWithWorkspace({ email: `dave-${suffix}@example.com`, password: "password123", name: "Dave" });
  [alice, aliceWs, dave, daveWs] = [a.user, a.workspace, d.user, d.workspace];
  // A shared workspace Alice owns with Dave as admin → must transfer on deletion.
  const [s] = await db.insert(workspaces).values({ slug: `shared-${suffix}`, name: "Shared", ownerId: alice.id }).returning();
  sharedWs = s;
  await db.insert(workspaceMembers).values([
    { workspaceId: s.id, userId: alice.id, role: "owner" },
    { workspaceId: s.id, userId: dave.id, role: "admin" },
  ]);
});

afterAll(async () => {
  for (const w of [aliceWs, daveWs, sharedWs]) await db.delete(workspaces).where(eq(workspaces.id, w.id));
  await db.delete(users).where(eq(users.id, alice.id));
  await db.delete(users).where(eq(users.id, dave.id));
});

describe("account settings", () => {
  it("updates profile fields with validation", async () => {
    currentUser = alice;
    const bad = await profileRoute.PATCH(req("PATCH", { timezone: "Mars/Olympus" }), undefined);
    expect(bad.status).toBe(400);
    const ok = await profileRoute.PATCH(req("PATCH", { name: "Alice B", timezone: "Asia/Kolkata", locale: "hi", avatarUrl: "https://example.com/a.png" }), undefined);
    expect(ok.status).toBe(200);
    expect((await ok.json()).user).toMatchObject({ name: "Alice B", timezone: "Asia/Kolkata", locale: "hi", avatarUrl: "https://example.com/a.png" });
    const http = await profileRoute.PATCH(req("PATCH", { avatarUrl: "http://example.com/a.png" }), undefined);
    expect(http.status).toBe(400);
  });

  it("changes the password with the current one and revokes other sessions", async () => {
    const s1 = await createSession(alice.id, { userAgent: "test-1" });
    const s2 = await createSession(alice.id, { userAgent: "test-2" });
    currentSessionId = hashToken(s1.token);
    currentUser = (await db.select().from(users).where(eq(users.id, alice.id)))[0];
    const list = await sessionsRoute.GET(req("GET"), undefined);
    const items = (await list.json()).sessions as { id: string; current: boolean }[];
    expect(items.find((s) => s.id === currentSessionId)?.current).toBe(true);
    expect(items.find((s) => s.id === hashToken(s2.token))?.current).toBe(false);

    const wrong = await passwordRoute.POST(req("POST", { currentPassword: "nope", newPassword: "newpassword1" }), undefined);
    expect(wrong.status).toBe(400);
    const weak = await passwordRoute.POST(req("POST", { currentPassword: "password123", newPassword: "short" }), undefined);
    expect(weak.status).toBe(400);
    const ok = await passwordRoute.POST(req("POST", { currentPassword: "password123", newPassword: "newpassword1" }), undefined);
    expect(ok.status).toBe(200);
    expect((await ok.json()).revokedSessions).toBe(1);
    const remaining = await db.select().from(sessions).where(eq(sessions.userId, alice.id));
    expect(remaining.map((s) => s.id)).toEqual([currentSessionId]);
    const [u] = await db.select().from(users).where(eq(users.id, alice.id));
    expect(await verifyPassword("newpassword1", u.passwordHash)).toBe(true);
    currentUser = u;
  });

  it("exports profile, workspaces and owned projects as a JSON download", async () => {
    const res = await exportRoute.GET(req("GET"), undefined);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="codexa-export-/);
    const data = await res.json();
    expect(data.format).toBe("codexa-account-export/v1");
    expect(data.user.email).toBe(alice.email);
    expect(data.workspaces.map((w: { id: string }) => w.id).sort()).toEqual([aliceWs.id, sharedWs.id].sort());
    expect(Array.isArray(data.projects)).toBe(true);
  });

  it("deletes the account: anonymises, purges sessions, deletes solo workspaces and transfers shared ones", async () => {
    const wrong = await deleteRoute.POST(req("POST", { password: "wrong" }), undefined);
    expect(wrong.status).toBe(400);
    const res = await deleteRoute.POST(req("POST", { password: "newpassword1" }), undefined);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toEqual([aliceWs.id]);
    expect(body.transferred).toEqual([sharedWs.id]);

    const [u] = await db.select().from(users).where(eq(users.id, alice.id));
    expect(u.email).toBe(`deleted+${alice.id}@invalid`);
    expect(u.name).toBe("Deleted user");
    expect(u.passwordHash).toBeNull();
    expect(u.deletedAt).not.toBeNull();
    expect(await db.select().from(sessions).where(eq(sessions.userId, alice.id))).toHaveLength(0);
    expect(await db.select().from(workspaceMembers).where(eq(workspaceMembers.userId, alice.id))).toHaveLength(0);

    const [solo] = await db.select().from(workspaces).where(eq(workspaces.id, aliceWs.id));
    expect(solo.deletedAt).not.toBeNull();
    const [shared] = await db.select().from(workspaces).where(eq(workspaces.id, sharedWs.id));
    expect(shared.deletedAt).toBeNull();
    expect(shared.ownerId).toBe(dave.id);
    const [heir] = await db.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, sharedWs.id), eq(workspaceMembers.userId, dave.id)));
    expect(heir.role).toBe("owner");
    const audit = await db.select().from(auditLogs).where(and(eq(auditLogs.actorId, alice.id), eq(auditLogs.action, "account.deleted")));
    expect(audit).toHaveLength(1);
  });
});
