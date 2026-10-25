/**
 * Showcase submission and approval visibility, against the real test database.
 * requireApiUser() is mocked so each request runs as a chosen user; access
 * checks, the service and the DB are exercised for real.
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
import { users, workspaces, type Project, type User, type Workspace } from "@/db/schema";
import { createUserWithWorkspace } from "@/lib/auth/users";
import { createProject } from "@/lib/services/projects";
import { approveShowcaseEntry, getBySlug, getEntryForProject, listApproved, listPending, rejectShowcaseEntry } from "@/lib/services/showcase";
import { GET, POST } from "@/app/api/v1/showcase/route";

const suffix = Date.now().toString(36);
let alice: User;
let aliceWs: Workspace;
let bob: User;
let bobWs: Workspace;
let project: Project;

const req = (method: string, path: string, body?: unknown) =>
  new Request(`http://test.local/api/v1${path}`, { method, headers: body !== undefined ? { "Content-Type": "application/json" } : {}, body: body !== undefined ? JSON.stringify(body) : undefined });
const as = (u: User | null) => {
  currentUser = u;
};

beforeAll(async () => {
  ({ user: alice, workspace: aliceWs } = await createUserWithWorkspace({ email: `showcase-alice-${suffix}@test.local`, name: "Alice Showcase" }));
  ({ user: bob, workspace: bobWs } = await createUserWithWorkspace({ email: `showcase-bob-${suffix}@test.local`, name: "Bob Showcase" }));
  project = await createProject({ workspaceId: aliceWs.id, name: `Showcase project ${suffix}`, templateId: "vite-react-starter", createdBy: alice.id });
});

afterAll(async () => {
  for (const ws of [aliceWs, bobWs]) if (ws) await db.delete(workspaces).where(eq(workspaces.id, ws.id));
  for (const u of [alice, bob]) if (u) await db.delete(users).where(eq(users.id, u.id));
});

describe("POST /api/v1/showcase", () => {
  it("requires authentication", async () => {
    as(null);
    const res = await POST(req("POST", "/showcase", { projectId: project.id, title: "Nope", description: "x".repeat(30), tags: [] }), undefined);
    expect(res.status).toBe(401);
  });

  it("validates the body", async () => {
    as(alice);
    const res = await POST(req("POST", "/showcase", { projectId: project.id, title: "ab", description: "too short", tags: [], liveUrl: "not a url" }), undefined);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; details: { path: string }[] } };
    expect(body.error.code).toBe("bad_request");
    expect(body.error.details.map((d) => d.path)).toEqual(expect.arrayContaining(["title", "description", "liveUrl"]));
  });

  it("rejects users without editor access to the project", async () => {
    as(bob);
    const res = await POST(req("POST", "/showcase", { projectId: project.id, title: "Bob's take", description: "Bob should not be able to submit Alice's project.", tags: [] }), undefined);
    expect([403, 404]).toContain(res.status);
  });

  it("creates a pending entry that is not public until approved", async () => {
    as(alice);
    const title = `Alice App ${suffix}`;
    const res = await POST(req("POST", "/showcase", { projectId: project.id, title, description: "A real project submitted through the test suite to check the review flow.", tags: ["React", " react ", "test"], liveUrl: "" }), undefined);
    expect(res.status).toBe(201);
    const { entry } = (await res.json()) as { entry: { id: string; slug: string; status: string } };
    expect(entry.status).toBe("pending");
    expect(entry.slug).toMatch(/^alice-app-/);

    // Not public yet.
    as(null);
    const pub = (await (await GET(req("GET", "/showcase"), undefined)).json()) as { entries: { id: string }[] };
    expect(pub.entries.some((e) => e.id === entry.id)).toBe(false);
    expect(await getBySlug(entry.slug)).toBeNull();
    expect((await listPending()).some((e) => e.id === entry.id)).toBe(true);

    // The submitter sees it in "mine" with the pending status; tags are normalised.
    as(alice);
    const mine = (await (await GET(req("GET", "/showcase?mine=1"), undefined)).json()) as { entries: { id: string; status: string; tags: string[] }[] };
    const own = mine.entries.find((e) => e.id === entry.id)!;
    expect(own.status).toBe("pending");
    expect(own.tags).toEqual(["react", "test"]);

    // A second submission for the same project conflicts.
    const dup = await POST(req("POST", "/showcase", { projectId: project.id, title: "Again", description: "Trying to submit the same project a second time.", tags: [] }), undefined);
    expect(dup.status).toBe(409);

    // Staff approval makes it public (service used by the admin area).
    const approved = await approveShowcaseEntry(entry.id);
    expect(approved.approvedAt).toBeInstanceOf(Date);
    as(null);
    const after = (await (await GET(req("GET", "/showcase"), undefined)).json()) as { entries: { id: string; status: string; submittedBy: { name: string } | null; project: { id: string } }[] };
    const visible = after.entries.find((e) => e.id === entry.id)!;
    expect(visible.status).toBe("approved");
    expect(visible.project.id).toBe(project.id);
    expect(visible.submittedBy?.name).toBe("Alice Showcase");
    const bySlug = await getBySlug(entry.slug);
    expect(bySlug?.title).toBe(title);
    expect((await listApproved({ tag: "react" })).some((e) => e.id === entry.id)).toBe(true);
    expect((await listApproved({ tag: "nope" })).some((e) => e.id === entry.id)).toBe(false);

    // Rejection removes it, so the project can be resubmitted.
    await rejectShowcaseEntry(entry.id);
    expect(await getBySlug(entry.slug)).toBeNull();
    expect(await getEntryForProject(project.id)).toBeNull();
    await expect(rejectShowcaseEntry(entry.id)).rejects.toMatchObject({ status: 404 });
  });
});
