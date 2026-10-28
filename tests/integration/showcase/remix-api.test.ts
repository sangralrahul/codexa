/**
 * Showcase remix API against the real test database: only approved entries whose project is public
 * can be remixed; files (not settings/secrets) are copied into a private project in the caller's
 * workspace; the entry's remix count goes up; project quota and rate limit apply.
 * requireApiUser() is mocked, and cookies() returns no workspace selection (so the default
 * workspace is the "current" one).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

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

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { projectActivity, projects, showcaseEntries, users, workspaces, type User, type Workspace } from "@/db/schema";
import { PLANS } from "@/config/plans";
import { createUserWithWorkspace } from "@/lib/auth/users";
import { createProject, getAllFiles } from "@/lib/services/projects";
import * as remixRoute from "@/app/api/v1/showcase/[slug]/remix/route";

const suffix = Date.now().toString(36);
let alice: User;
let aliceWs: Workspace;
let bob: User;
let bobWs: Workspace;
let carol: User;
let carolWs: Workspace;
let dave: User;
let daveWs: Workspace;

const SOURCE_FILES = { "index.html": "<h1>Remix me</h1>", "src/app.js": "console.log('hi');\n", "styles/site.css": "body { margin: 0 }\n" };
const slugs = { pub: `pub-${suffix}`, unlisted: `unl-${suffix}`, priv: `prv-${suffix}`, pending: `pend-${suffix}` };
let publicProjectId: string;

const B = "http://test.local/api/v1";
const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });
const remix = (slug: string, body?: unknown) =>
  remixRoute.POST(
    new Request(`${B}/showcase/${slug}/remix`, { method: "POST", headers: body !== undefined ? { "Content-Type": "application/json" } : {}, body: body !== undefined ? JSON.stringify(body) : undefined }),
    ctx(slug),
  );
const as = (u: User | null) => {
  currentUser = u;
};
const read = async (res: Response) => {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
};
const remixCount = async (slug: string) => (await db.select({ n: showcaseEntries.remixCount }).from(showcaseEntries).where(eq(showcaseEntries.slug, slug)))[0].n;

async function entry(slug: string, visibility: "public" | "unlisted" | "private", approved: boolean) {
  const p = await createProject({ workspaceId: aliceWs.id, createdBy: alice.id, name: `Src ${slug}`, templateId: "static-site", visibility, files: SOURCE_FILES });
  await db.insert(showcaseEntries).values({ projectId: p.id, slug, title: `Title ${slug}`, description: "A community project for remix tests.", submittedBy: alice.id, approvedAt: approved ? new Date() : null });
  return p.id;
}

beforeAll(async () => {
  ({ user: alice, workspace: aliceWs } = await createUserWithWorkspace({ email: `rmx-a-${suffix}@test.local`, name: "Alice" }));
  ({ user: bob, workspace: bobWs } = await createUserWithWorkspace({ email: `rmx-b-${suffix}@test.local`, name: "Bob" }));
  ({ user: carol, workspace: carolWs } = await createUserWithWorkspace({ email: `rmx-c-${suffix}@test.local`, name: "Carol" }));
  ({ user: dave, workspace: daveWs } = await createUserWithWorkspace({ email: `rmx-d-${suffix}@test.local`, name: "Dave" }));
  publicProjectId = await entry(slugs.pub, "public", true);
  await entry(slugs.unlisted, "unlisted", true);
  await entry(slugs.priv, "private", true);
  await entry(slugs.pending, "public", false);
});

afterAll(async () => {
  const wsIds = [aliceWs, bobWs, carolWs, daveWs].map((w) => w.id);
  await db.delete(projects).where(inArray(projects.workspaceId, wsIds));
  await db.delete(workspaces).where(inArray(workspaces.id, wsIds));
  await db.delete(users).where(inArray(users.id, [alice, bob, carol, dave].map((u) => u.id)));
});

describe("POST /showcase/:slug/remix", () => {
  it("requires sign-in", async () => {
    as(null);
    expect((await remix(slugs.pub)).status).toBe(401);
  });

  it("copies an approved public project's files into the caller's current workspace", async () => {
    as(bob);
    const res = await remix(slugs.pub);
    expect(res.status).toBe(201);
    const { project } = await read(res);
    expect(project.workspaceId).toBe(bobWs.id);
    expect(project.visibility).toBe("private");
    expect(project.name).toBe(`Title ${slugs.pub} (remix)`);
    expect(project.description).toContain(`/showcase/${slugs.pub}`);
    expect(project.templateId).toBe("static-site");
    expect(await getAllFiles(project.id)).toEqual(SOURCE_FILES);

    const activity = await db.select().from(projectActivity).where(and(eq(projectActivity.projectId, project.id), eq(projectActivity.kind, "project.remixed")));
    expect(activity).toHaveLength(1);
    expect(activity[0].metadata).toMatchObject({ showcaseSlug: slugs.pub, sourceProjectId: publicProjectId });
    expect(await remixCount(slugs.pub)).toBe(1);

    // The source is untouched.
    expect(await getAllFiles(publicProjectId)).toEqual(SOURCE_FILES);
  });

  it("accepts an explicit workspaceId the caller can edit and increments the count again", async () => {
    as(bob);
    const res = await remix(slugs.pub, { workspaceId: bobWs.id });
    expect(res.status).toBe(201);
    expect((await read(res)).project.workspaceId).toBe(bobWs.id);
    expect(await remixCount(slugs.pub)).toBe(2);
  });

  it("refuses a workspace the caller is not a member of", async () => {
    as(bob);
    const res = await remix(slugs.pub, { workspaceId: aliceWs.id });
    expect(res.status).toBe(404);
    expect(await remixCount(slugs.pub)).toBe(2);
  });

  it("validates the body", async () => {
    as(bob);
    expect((await remix(slugs.pub, { workspaceId: 42 })).status).toBe(400);
  });

  it("returns 404 for unlisted, private, unapproved and unknown entries", async () => {
    as(bob);
    for (const slug of [slugs.unlisted, slugs.priv, slugs.pending, `missing-${suffix}`]) {
      const res = await remix(slug);
      expect(res.status, slug).toBe(404);
      const body = await read(res);
      expect(body.error.message).toMatch(/not available to remix/);
    }
    expect(await remixCount(slugs.unlisted)).toBe(0);
    expect(await remixCount(slugs.priv)).toBe(0);
    expect(await remixCount(slugs.pending)).toBe(0);
    const bobProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, bobWs.id));
    expect(bobProjects).toHaveLength(2); // only the two successful remixes
  });

  it("enforces the workspace project quota", async () => {
    as(carol);
    const limit = PLANS.free.limits.projects;
    for (let i = 0; i < limit; i++) await createProject({ workspaceId: carolWs.id, createdBy: carol.id, name: `Q${i}`, templateId: "static-site" });
    const before = await remixCount(slugs.pub);
    const res = await remix(slugs.pub);
    expect(res.status).toBe(402);
    const body = await read(res);
    expect(body.error.code).toBe("quota_exceeded");
    expect(body.error.details).toMatchObject({ kind: "projects", used: limit, limit });
    expect(await remixCount(slugs.pub)).toBe(before);
  });

  it("rate-limits remixes per user (10 per minute)", async () => {
    as(dave);
    for (let i = 0; i < 10; i++) expect((await remix(`missing-${suffix}`)).status).toBe(404);
    expect((await remix(slugs.pub)).status).toBe(429);
    const daveProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, daveWs.id));
    expect(daveProjects).toHaveLength(0);
  });
});
