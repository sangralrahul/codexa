/**
 * Invites and member management through the real routes with requireApiUser() mocked.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

let currentUser: User | null = null;
vi.mock("@/lib/auth/guards", async (orig) => {
  const mod = await orig<typeof import("@/lib/auth/guards")>();
  return { ...mod, requireApiUser: async () => { if (!currentUser) throw new mod.AuthError(); return currentUser; } };
});
vi.mock("@/lib/auth/session", async (orig) => {
  const mod = await orig<typeof import("@/lib/auth/session")>();
  return { ...mod, getCurrentUser: async () => currentUser, getCurrentSessionId: async () => null, clearSessionCookie: async () => undefined };
});

import { and, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, emailOutbox, subscriptions, users, workspaceInvites, workspaceMembers, workspaces, type User, type Workspace } from "@/db/schema";
import { createUserWithWorkspace } from "@/lib/auth/users";
import { hashToken } from "@/lib/crypto";
import * as invitesRoute from "@/app/api/v1/workspaces/[id]/invites/route";
import * as inviteRoute from "@/app/api/v1/workspaces/[id]/invites/[inviteId]/route";
import * as resendRoute from "@/app/api/v1/workspaces/[id]/invites/[inviteId]/resend/route";
import * as membersRoute from "@/app/api/v1/workspaces/[id]/members/route";
import * as memberRoute from "@/app/api/v1/workspaces/[id]/members/[userId]/route";
import * as acceptRoute from "@/app/api/v1/invites/[token]/route";

const suffix = Date.now().toString(36);
const B = "http://test.local/api/v1";
const ctx = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const req = (method: string, path: string, body?: unknown) =>
  new Request(`${B}${path}`, { method, headers: body !== undefined ? { "Content-Type": "application/json" } : {}, body: body !== undefined ? JSON.stringify(body) : undefined });
const as = (u: User | null) => { currentUser = u; };

let owner: User, ownerWs: Workspace, bob: User, bobWs: Workspace, carol: User, carolWs: Workspace;
const cleanupUsers: string[] = [];
const cleanupWs: string[] = [];

beforeAll(async () => {
  const o = await createUserWithWorkspace({ email: `owner-${suffix}@example.com`, password: "password123", name: "Owner", emailVerified: true });
  const b = await createUserWithWorkspace({ email: `bob-${suffix}@example.com`, password: "password123", name: "Bob", emailVerified: true });
  const c = await createUserWithWorkspace({ email: `carol-${suffix}@example.com`, password: "password123", name: "Carol", emailVerified: true });
  [owner, ownerWs, bob, bobWs, carol, carolWs] = [o.user, o.workspace, b.user, b.workspace, c.user, c.workspace];
  cleanupUsers.push(owner.id, bob.id, carol.id);
  cleanupWs.push(ownerWs.id, bobWs.id, carolWs.id);
});

afterAll(async () => {
  await db.delete(emailOutbox).where(like(emailOutbox.to, `%${suffix}@example.com`));
  await db.delete(subscriptions).where(eq(subscriptions.workspaceId, ownerWs.id));
  await db.delete(workspaces).where(eq(workspaces.id, ownerWs.id));
  await db.delete(workspaces).where(eq(workspaces.id, bobWs.id));
  await db.delete(workspaces).where(eq(workspaces.id, carolWs.id));
  for (const id of cleanupUsers) await db.delete(users).where(eq(users.id, id));
});

async function tokenFor(inviteId: string) {
  // The API never returns the raw token; read the outbox email the service wrote (outbox fallback).
  const [inv] = await db.select().from(workspaceInvites).where(eq(workspaceInvites.id, inviteId));
  const mails = await db.select().from(emailOutbox).where(eq(emailOutbox.to, inv.email)).orderBy(emailOutbox.createdAt);
  for (const m of [...mails].reverse()) {
    const match = m.text.match(/\/invite\/([A-Za-z0-9_-]+)/);
    if (match && hashToken(match[1]) === inv.tokenHash) return match[1];
  }
  throw new Error("invite token not found in outbox");
}

describe("workspace invites", () => {
  let inviteId: string;

  it("free plan (1 seat) blocks invitations with 402 quota_exceeded", async () => {
    as(owner);
    const res = await invitesRoute.POST(req("POST", `/workspaces/${ownerWs.id}/invites`, { email: bob.email, role: "editor" }), ctx({ id: ownerWs.id }));
    expect(res.status).toBe(402);
    expect((await res.json()).error.code).toBe("quota_exceeded");
  });

  it("owner creates an invitation on a Team plan (manual subscription) and the email goes to the outbox", async () => {
    await db.insert(subscriptions).values({ workspaceId: ownerWs.id, plan: "team", status: "active", provider: "manual", providerSubscriptionId: `manual:${ownerWs.id}`, currentPeriodEnd: new Date(Date.now() + 86400_000) });
    as(owner);
    const res = await invitesRoute.POST(req("POST", `/workspaces/${ownerWs.id}/invites`, { email: bob.email.toUpperCase(), role: "editor" }), ctx({ id: ownerWs.id }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.invite).toMatchObject({ email: bob.email, role: "editor" });
    expect(["outbox", "sent"]).toContain(body.emailStatus);
    inviteId = body.invite.id;
    const audit = await db.select().from(auditLogs).where(and(eq(auditLogs.workspaceId, ownerWs.id), eq(auditLogs.action, "team.invite_created")));
    expect(audit.length).toBeGreaterThan(0);
  });

  it("duplicates are rejected and non-admins cannot invite", async () => {
    as(owner);
    expect((await invitesRoute.POST(req("POST", `/workspaces/${ownerWs.id}/invites`, { email: bob.email, role: "viewer" }), ctx({ id: ownerWs.id }))).status).toBe(409);
    as(bob);
    expect((await invitesRoute.POST(req("POST", `/workspaces/${ownerWs.id}/invites`, { email: carol.email, role: "viewer" }), ctx({ id: ownerWs.id }))).status).toBe(404); // not a member: existence hidden
  });

  it("preview is public; the wrong account cannot accept; the invited email can", async () => {
    const token = await tokenFor(inviteId);
    as(null);
    const preview = await acceptRoute.GET(req("GET", `/invites/${token}`), ctx({ token }));
    expect(preview.status).toBe(200);
    expect(await preview.json()).toMatchObject({ workspace: { id: ownerWs.id, name: ownerWs.name }, role: "editor", email: bob.email, viewer: null });

    as(carol);
    const wrong = await acceptRoute.POST(req("POST", `/invites/${token}`), ctx({ token }));
    expect(wrong.status).toBe(400);
    expect((await wrong.json()).error.message).toMatch(/different email/);

    as(bob);
    const ok = await acceptRoute.POST(req("POST", `/invites/${token}`), ctx({ token }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).workspace.id).toBe(ownerWs.id);
    const [m] = await db.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, ownerWs.id), eq(workspaceMembers.userId, bob.id)));
    expect(m.role).toBe("editor");
    const again = await acceptRoute.POST(req("POST", `/invites/${token}`), ctx({ token }));
    expect(again.status).toBe(400);
  });

  it("resend re-issues the token and revoke deletes a pending invite", async () => {
    as(owner);
    const created = await invitesRoute.POST(req("POST", `/workspaces/${ownerWs.id}/invites`, { email: carol.email, role: "viewer" }), ctx({ id: ownerWs.id }));
    expect(created.status).toBe(201);
    const id = (await created.json()).invite.id as string;
    const oldToken = await tokenFor(id);
    const resent = await resendRoute.POST(req("POST", `/workspaces/${ownerWs.id}/invites/${id}/resend`), ctx({ id: ownerWs.id, inviteId: id }));
    expect(resent.status).toBe(200);
    const newToken = await tokenFor(id);
    expect(newToken).not.toBe(oldToken);
    as(carol);
    expect((await acceptRoute.POST(req("POST", `/invites/${oldToken}`), ctx({ token: oldToken }))).status).toBe(400);
    as(owner);
    expect((await inviteRoute.DELETE(req("DELETE", `/workspaces/${ownerWs.id}/invites/${id}`), ctx({ id: ownerWs.id, inviteId: id }))).status).toBe(200);
    as(null);
    expect((await acceptRoute.GET(req("GET", `/invites/${newToken}`), ctx({ token: newToken }))).status).toBe(404);
  });
});

describe("members and roles", () => {
  it("lists members (invites only for admins)", async () => {
    as(bob);
    const res = await membersRoute.GET(req("GET", `/workspaces/${ownerWs.id}/members`), ctx({ id: ownerWs.id }));
    const body = await res.json();
    expect(body.role).toBe("editor");
    expect(body.members.map((m: { userId: string }) => m.userId).sort()).toEqual([owner.id, bob.id].sort());
    expect(body.invites).toEqual([]);
  });

  it("editors cannot change roles; the last owner cannot be demoted; owner can promote and transfer", async () => {
    as(bob);
    expect((await memberRoute.PATCH(req("PATCH", `/workspaces/${ownerWs.id}/members/${owner.id}`, { role: "viewer" }), ctx({ id: ownerWs.id, userId: owner.id }))).status).toBe(403);
    as(owner);
    const demote = await memberRoute.PATCH(req("PATCH", `/workspaces/${ownerWs.id}/members/${owner.id}`, { role: "admin" }), ctx({ id: ownerWs.id, userId: owner.id }));
    expect(demote.status).toBe(400);
    expect((await demote.json()).error.message).toMatch(/at least one owner/);
    const promote = await memberRoute.PATCH(req("PATCH", `/workspaces/${ownerWs.id}/members/${bob.id}`, { role: "admin" }), ctx({ id: ownerWs.id, userId: bob.id }));
    expect(promote.status).toBe(200);
    expect((await promote.json()).member.role).toBe("admin");
    // admin cannot touch owners
    as(bob);
    expect((await memberRoute.PATCH(req("PATCH", `/workspaces/${ownerWs.id}/members/${owner.id}`, { role: "admin" }), ctx({ id: ownerWs.id, userId: owner.id }))).status).toBe(403);
    expect((await memberRoute.DELETE(req("DELETE", `/workspaces/${ownerWs.id}/members/${owner.id}`), ctx({ id: ownerWs.id, userId: owner.id }))).status).toBe(403);
    // explicit transfer by the owner
    as(owner);
    expect((await memberRoute.PATCH(req("PATCH", `/workspaces/${ownerWs.id}/members/${bob.id}`, { role: "owner" }), ctx({ id: ownerWs.id, userId: bob.id }))).status).toBe(200);
    const [w] = await db.select().from(workspaces).where(eq(workspaces.id, ownerWs.id));
    expect(w.ownerId).toBe(bob.id);
    // now the original owner can step down and leave
    expect((await memberRoute.PATCH(req("PATCH", `/workspaces/${ownerWs.id}/members/${owner.id}`, { role: "editor" }), ctx({ id: ownerWs.id, userId: owner.id }))).status).toBe(200);
    const leave = await memberRoute.DELETE(req("DELETE", `/workspaces/${ownerWs.id}/members/${owner.id}`), ctx({ id: ownerWs.id, userId: owner.id }));
    expect(leave.status).toBe(200);
    expect((await leave.json()).left).toBe(true);
    as(bob);
    expect((await memberRoute.DELETE(req("DELETE", `/workspaces/${ownerWs.id}/members/${bob.id}`), ctx({ id: ownerWs.id, userId: bob.id }))).status).toBe(400); // last owner
  });
});
