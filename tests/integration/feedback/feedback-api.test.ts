/**
 * Client feedback (review links + pinned comments) against the real test database: owner link
 * lifecycle, the public token API (validation, rate limit, cap) and owner moderation, with access
 * checks. requireApiUser() is mocked.
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

import { and, eq } from "drizzle-orm";
import { chunked, db } from "@/db";
import { deployments, feedbackComments, projects, runtimeSessions, users, workspaceMembers, workspaces, type User, type Workspace } from "@/db/schema";
import { createUserWithWorkspace } from "@/lib/auth/users";
import { createProject } from "@/lib/services/projects";
import { MAX_OPEN_COMMENTS } from "@/lib/services/feedback";
import { fixPrompt } from "@/components/workspace/feedback-panel";
import * as linksRoute from "@/app/api/v1/projects/[id]/feedback/links/route";
import * as commentsRoute from "@/app/api/v1/projects/[id]/feedback/comments/route";
import * as commentRoute from "@/app/api/v1/projects/[id]/feedback/comments/[commentId]/route";
import * as reviewRoute from "@/app/api/review/[token]/route";
import * as reviewCommentsRoute from "@/app/api/review/[token]/comments/route";

vi.mock("@/lib/client/events", () => ({ emit: () => undefined }));

const suffix = Date.now().toString(36);
let alice: User;
let aliceWs: Workspace;
let bob: User;
let bobWs: Workspace;
let carol: User; // viewer in Alice's workspace
let carolWs: Workspace;
let projectId: string;
let token = "";

const ctx = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const req = (method: string, url: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://test.local${url}`, {
    method,
    headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
const as = (u: User | null) => {
  currentUser = u;
};
const read = async (res: Response) => {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
};
const P = () => `/api/v1/projects/${projectId}/feedback`;
let ipN = 0;
const freshIp = () => `10.${suffix.length}.${Math.floor(++ipN / 250)}.${ipN % 250}-${suffix}`;
const postComment = (body: unknown, ip = freshIp(), t = token) => reviewCommentsRoute.POST(req("POST", `/api/review/${t}/comments`, body, { "x-forwarded-for": ip }), ctx({ token: t }));
const valid = (over: Record<string, unknown> = {}) => ({
  authorName: "Dana Client",
  body: "Make this button bigger",
  pagePath: "/pricing",
  element: { path: "main > section:nth-of-type(2) > button", tag: "button", text: "Buy now", html: '<button class="btn">Buy now</button>' },
  ...over,
});

beforeAll(async () => {
  ({ user: alice, workspace: aliceWs } = await createUserWithWorkspace({ email: `fb-a-${suffix}@test.local`, name: "Alice" }));
  ({ user: bob, workspace: bobWs } = await createUserWithWorkspace({ email: `fb-b-${suffix}@test.local`, name: "Bob" }));
  ({ user: carol, workspace: carolWs } = await createUserWithWorkspace({ email: `fb-c-${suffix}@test.local`, name: "Carol" }));
  await db.insert(workspaceMembers).values({ workspaceId: aliceWs.id, userId: carol.id, role: "viewer" });
  projectId = (await createProject({ workspaceId: aliceWs.id, createdBy: alice.id, name: `Feedback ${suffix}`, templateId: "static-site" })).id;
});

afterAll(async () => {
  await db.delete(projects).where(eq(projects.id, projectId));
  for (const ws of [aliceWs, bobWs, carolWs]) await db.delete(workspaces).where(eq(workspaces.id, ws.id));
  for (const u of [alice, bob, carol]) await db.delete(users).where(eq(users.id, u.id));
});

describe("review links (owner)", () => {
  it("starts with no link", async () => {
    as(alice);
    const res = await linksRoute.GET(req("GET", `${P()}/links`), ctx({ id: projectId }));
    expect(res.status).toBe(200);
    expect((await read(res)).link).toBeNull();
  });

  it("requires a signed-in editor of the project", async () => {
    as(null);
    expect((await linksRoute.POST(req("POST", `${P()}/links`), ctx({ id: projectId }))).status).toBe(401);
    as(bob);
    expect([403, 404]).toContain((await linksRoute.POST(req("POST", `${P()}/links`), ctx({ id: projectId }))).status);
    as(carol);
    expect((await linksRoute.POST(req("POST", `${P()}/links`), ctx({ id: projectId }))).status).toBe(403);
    expect((await linksRoute.GET(req("GET", `${P()}/links`), ctx({ id: projectId }))).status).toBe(403);
  });

  it("creates a link whose URL is shown once and resolves publicly", async () => {
    as(alice);
    const res = await linksRoute.POST(req("POST", `${P()}/links`), ctx({ id: projectId }));
    expect(res.status).toBe(201);
    const body = await read(res);
    expect(body.url).toMatch(/\/review\/[A-Za-z0-9_-]{20,}$/);
    token = body.url.split("/review/")[1];
    const status = await read(await linksRoute.GET(req("GET", `${P()}/links`), ctx({ id: projectId })));
    expect(status.link.id).toBe(body.link.id);
    expect(JSON.stringify(status)).not.toContain(token);

    as(null);
    const pub = await reviewRoute.GET(req("GET", `/api/review/${token}`), ctx({ token }));
    expect(pub.status).toBe(200);
    const data = await read(pub);
    expect(data.project.name).toBe(`Feedback ${suffix}`);
    expect(data.target).toEqual({ kind: "none" });
    expect(data.comments).toEqual([]);
  });

  it("creating a new link revokes the old one", async () => {
    as(alice);
    const old = token;
    const body = await read(await linksRoute.POST(req("POST", `${P()}/links`), ctx({ id: projectId })));
    token = body.url.split("/review/")[1];
    expect(token).not.toBe(old);
    expect((await reviewRoute.GET(req("GET", `/api/review/${old}`), ctx({ token: old }))).status).toBe(404);
    expect((await reviewRoute.GET(req("GET", `/api/review/${token}`), ctx({ token }))).status).toBe(200);
  });

  it("unknown tokens are 404", async () => {
    expect((await reviewRoute.GET(req("GET", "/api/review/nope"), ctx({ token: "nope" }))).status).toBe(404);
    expect((await postComment(valid(), freshIp(), "nope")).status).toBe(404);
  });
});

describe("review target", () => {
  it("shows a running preview when nothing is published", async () => {
    await db.insert(runtimeSessions).values({ projectId, status: "running", previewUrl: "http://tok.preview.localhost:4100/", previewToken: `tok-${suffix}` });
    const data = await read(await reviewRoute.GET(req("GET", `/api/review/${token}`), ctx({ token })));
    expect(data.target).toEqual({ kind: "preview", url: "http://tok.preview.localhost:4100/" });
  });

  it("prefers the live site, opened in review mode", async () => {
    await db.insert(deployments).values({ projectId, provider: "codexa", status: "live", url: `http://fb-${suffix}.sites.localhost:4100/`, config: { slug: `fb-${suffix}` }, finishedAt: new Date() });
    const data = await read(await reviewRoute.GET(req("GET", `/api/review/${token}`), ctx({ token })));
    expect(data.target).toEqual({ kind: "live", url: `http://fb-${suffix}.sites.localhost:4100/?__codexa_review=1` });
  });
});

describe("public comments", () => {
  let commentId = "";

  it("posts a comment without a Codexa login", async () => {
    as(null);
    const res = await postComment(valid({ authorName: "  Dana Client  " }));
    expect(res.status).toBe(201);
    const { comment } = await read(res);
    commentId = comment.id;
    expect(comment.authorName).toBe("Dana Client");
    expect(comment.element).toEqual({ path: "main > section:nth-of-type(2) > button", tag: "button", text: "Buy now" });
    expect(comment).not.toHaveProperty("status");
    const data = await read(await reviewRoute.GET(req("GET", `/api/review/${token}`), ctx({ token })));
    expect(data.comments.map((c: { id: string }) => c.id)).toEqual([commentId]);
    expect(data.comments[0].element).not.toHaveProperty("html");
  });

  it("accepts a whole-page comment", async () => {
    const res = await postComment(valid({ element: null, pagePath: "/" }));
    expect(res.status).toBe(201);
    expect((await read(res)).comment.element).toBeNull();
  });

  it("validates the body", async () => {
    const ip = freshIp();
    expect((await postComment(valid({ authorName: "" }), ip)).status).toBe(400);
    expect((await postComment(valid({ authorName: "x".repeat(61) }), ip)).status).toBe(400);
    expect((await postComment(valid({ body: "   " }), ip)).status).toBe(400);
    expect((await postComment(valid({ body: "x".repeat(2001) }), ip)).status).toBe(400);
    expect((await postComment(valid({ pagePath: "https://evil.test/" }), ip)).status).toBe(400);
    expect((await postComment(valid({ element: { path: "a", tag: "a", text: "x".repeat(301) } }), ip)).status).toBe(400);
    expect((await postComment(valid({ element: { path: "a", tag: "a", text: "", html: "x".repeat(901) } }), ip)).status).toBe(400);
  });

  it("rate-limits per IP", async () => {
    const ip = freshIp();
    for (let i = 0; i < 20; i++) expect((await postComment(valid({ body: `note ${i}` }), ip)).status).toBe(201);
    const limited = await postComment(valid(), ip);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
    expect((await postComment(valid(), freshIp())).status).toBe(201);
  });

  it("caps open comments per project", async () => {
    const current = await db.select({ id: feedbackComments.id }).from(feedbackComments).where(and(eq(feedbackComments.projectId, projectId), eq(feedbackComments.status, "open")));
    const filler = Array.from({ length: MAX_OPEN_COMMENTS - current.length }, (_, i) => ({ projectId, authorName: "Filler", body: `f${i}`, pagePath: "/" }));
    for (const part of chunked(filler)) await db.insert(feedbackComments).values(part);
    expect((await postComment(valid())).status).toBe(409);
    await db.delete(feedbackComments).where(and(eq(feedbackComments.projectId, projectId), eq(feedbackComments.authorName, "Filler")));
    expect((await postComment(valid())).status).toBe(201);
  });

  describe("owner moderation", () => {
    it("lists comments newest first, filtered by status", async () => {
      as(carol); // viewers can read
      const res = await commentsRoute.GET(req("GET", `${P()}/comments`), ctx({ id: projectId }));
      expect(res.status).toBe(200);
      const body = await read(res);
      expect(body.comments.length).toBe(body.openCount);
      const times = body.comments.map((c: { createdAt: string }) => Date.parse(c.createdAt));
      expect([...times].sort((a, b) => b - a)).toEqual(times);
      expect(body.comments.find((c: { id: string }) => c.id === commentId).element.html).toContain("Buy now");
      expect((await commentsRoute.GET(req("GET", `${P()}/comments?status=bogus`), ctx({ id: projectId }))).status).toBe(400);
    });

    it("keeps other workspaces and viewers out of changes", async () => {
      as(bob);
      expect([403, 404]).toContain((await commentsRoute.GET(req("GET", `${P()}/comments`), ctx({ id: projectId }))).status);
      expect([403, 404]).toContain((await commentRoute.PATCH(req("PATCH", `${P()}/comments/${commentId}`, { status: "resolved" }), ctx({ id: projectId, commentId }))).status);
      as(carol);
      expect((await commentRoute.PATCH(req("PATCH", `${P()}/comments/${commentId}`, { status: "resolved" }), ctx({ id: projectId, commentId }))).status).toBe(403);
      expect((await commentRoute.DELETE(req("DELETE", `${P()}/comments/${commentId}`), ctx({ id: projectId, commentId }))).status).toBe(403);
    });

    it("resolves and reopens a comment; resolved comments leave the public page", async () => {
      as(alice);
      const res = await commentRoute.PATCH(req("PATCH", `${P()}/comments/${commentId}`, { status: "resolved" }), ctx({ id: projectId, commentId }));
      expect(res.status).toBe(200);
      const { comment } = await read(res);
      expect(comment.status).toBe("resolved");
      expect(comment.resolvedAt).toBeTruthy();
      const pub = await read(await reviewRoute.GET(req("GET", `/api/review/${token}`), ctx({ token })));
      expect(pub.comments.some((c: { id: string }) => c.id === commentId)).toBe(false);
      const resolved = await read(await commentsRoute.GET(req("GET", `${P()}/comments?status=resolved`), ctx({ id: projectId })));
      expect(resolved.comments.map((c: { id: string }) => c.id)).toEqual([commentId]);
      const reopened = await read(await commentRoute.PATCH(req("PATCH", `${P()}/comments/${commentId}`, { status: "open" }), ctx({ id: projectId, commentId })));
      expect(reopened.comment.status).toBe("open");
      expect(reopened.comment.resolvedAt).toBeNull();
      expect((await commentRoute.PATCH(req("PATCH", `${P()}/comments/${commentId}`, { status: "done" }), ctx({ id: projectId, commentId }))).status).toBe(400);
    });

    it("builds a Fix with AI prompt from the comment and its element", async () => {
      as(alice);
      const body = await read(await commentsRoute.GET(req("GET", `${P()}/comments`), ctx({ id: projectId })));
      const prompt = fixPrompt(body.comments.find((c: { id: string }) => c.id === commentId));
      expect(prompt).toContain("> Make this button bigger");
      expect(prompt).toContain("main > section:nth-of-type(2) > button");
      expect(prompt).toContain('<button class="btn">Buy now</button>');
    });

    it("deletes a comment", async () => {
      as(alice);
      expect((await commentRoute.DELETE(req("DELETE", `${P()}/comments/${commentId}`), ctx({ id: projectId, commentId }))).status).toBe(204);
      expect((await commentRoute.DELETE(req("DELETE", `${P()}/comments/${commentId}`), ctx({ id: projectId, commentId }))).status).toBe(404);
    });
  });
});

describe("revoking", () => {
  it("turns the link off: the public API answers 404", async () => {
    as(alice);
    expect((await linksRoute.DELETE(req("DELETE", `${P()}/links`), ctx({ id: projectId }))).status).toBe(204);
    expect((await reviewRoute.GET(req("GET", `/api/review/${token}`), ctx({ token }))).status).toBe(404);
    expect((await postComment(valid())).status).toBe(404);
    expect((await linksRoute.DELETE(req("DELETE", `${P()}/links`), ctx({ id: projectId }))).status).toBe(404);
    expect((await read(await linksRoute.GET(req("GET", `${P()}/links`), ctx({ id: projectId })))).link).toBeNull();
  });
});
