/**
 * Publishing API against the real test database: site names, taking a site offline, custom
 * domains (with the DNS lookup stubbed) and the analytics series. requireApiUser() is mocked.
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

// Hosting provider: re-pointing a live site is a status change on Cloudflare; no runner in tests.
vi.mock("@/lib/deploy", async (orig) => {
  const mod = await orig<typeof import("@/lib/deploy")>();
  return { ...mod, getDeployProvider: () => ({ rollback: async ({ slug }: { slug: string }) => ({ url: `http://${slug}.sites.test/` }) }) };
});

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deployments, projects, siteVisits, users, workspaces, type User, type Workspace } from "@/db/schema";
import { createUserWithWorkspace } from "@/lib/auth/users";
import { createProject } from "@/lib/services/projects";
import { domainError, normalizeDomain, siteNameError, verifyDomain } from "@/lib/services/publishing";
import * as publishingRoute from "@/app/api/v1/projects/[id]/publishing/route";
import * as unpublishRoute from "@/app/api/v1/projects/[id]/publishing/unpublish/route";
import * as domainsRoute from "@/app/api/v1/projects/[id]/domains/route";
import * as domainRoute from "@/app/api/v1/projects/[id]/domains/[domainId]/route";

const suffix = Date.now().toString(36);
let alice: User;
let aliceWs: Workspace;
let bob: User;
let bobWs: Workspace;
let projectId: string;
let otherProjectId: string;

const B = "http://test.local/api/v1";
const ctx = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const req = (method: string, path: string, body?: unknown) =>
  new Request(`${B}${path}`, { method, headers: body !== undefined ? { "Content-Type": "application/json" } : {}, body: body !== undefined ? JSON.stringify(body) : undefined });
const as = (u: User) => {
  currentUser = u;
};
const read = async (res: Response) => {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
};

beforeAll(async () => {
  ({ user: alice, workspace: aliceWs } = await createUserWithWorkspace({ email: `pub-a-${suffix}@test.local`, name: "Alice" }));
  ({ user: bob, workspace: bobWs } = await createUserWithWorkspace({ email: `pub-b-${suffix}@test.local`, name: "Bob" }));
  projectId = (await createProject({ workspaceId: aliceWs.id, createdBy: alice.id, name: `Site ${suffix}`, templateId: "static-site" })).id;
  otherProjectId = (await createProject({ workspaceId: bobWs.id, createdBy: bob.id, name: `Other ${suffix}`, templateId: "static-site" })).id;
});

afterAll(async () => {
  await db.delete(projects).where(eq(projects.id, projectId));
  await db.delete(projects).where(eq(projects.id, otherProjectId));
  for (const ws of [aliceWs, bobWs]) await db.delete(workspaces).where(eq(workspaces.id, ws.id));
  for (const u of [alice, bob]) await db.delete(users).where(eq(users.id, u.id));
});

describe("validation", () => {
  it("checks site names", () => {
    expect(siteNameError("my-shop")).toBeNull();
    expect(siteNameError("ab")).toMatch(/at least 3/);
    expect(siteNameError("My Shop")).toMatch(/lowercase/);
    expect(siteNameError("-shop")).toMatch(/lowercase/);
    expect(siteNameError("a--b")).toMatch(/Two hyphens/);
    expect(siteNameError("admin")).toMatch(/reserved/);
    expect(siteNameError("shop-preview")).toMatch(/reserved/);
  });
  it("normalizes and checks domains", () => {
    expect(normalizeDomain(" https://Shop.Example.com/path ")).toBe("shop.example.com");
    expect(domainError("shop.example.com")).toBeNull();
    expect(domainError("localhost")).toMatch(/Enter a domain/);
    expect(domainError("not a domain")).toMatch(/Enter a domain/);
  });
});

describe("publishing API", () => {
  it("returns settings, domains and an empty 30-day analytics series", async () => {
    as(alice);
    const res = await publishingRoute.GET(req("GET", `/projects/${projectId}/publishing`), ctx({ id: projectId }));
    expect(res.status).toBe(200);
    const body = await read(res);
    expect(body.publishing.live).toBeNull();
    expect(body.domains).toEqual([]);
    expect(body.analytics.series).toHaveLength(30);
    expect(body.analytics.total).toBe(0);
    expect(body.canManage).toBe(true);
  });

  it("keeps other workspaces out", async () => {
    as(bob);
    const res = await publishingRoute.GET(req("GET", `/projects/${projectId}/publishing`), ctx({ id: projectId }));
    expect([403, 404]).toContain(res.status);
  });

  it("renames the site and moves the live version to the new name", async () => {
    await db.insert(deployments).values({ projectId, provider: "codexa", status: "live", url: "http://old.local/", config: { slug: "old-name" }, finishedAt: new Date() });
    as(alice);
    const name = `shop-${suffix}`;
    const res = await publishingRoute.PATCH(req("PATCH", `/projects/${projectId}/publishing`, { siteName: name }), ctx({ id: projectId }));
    expect(res.status).toBe(200);
    expect((await read(res)).publishing.siteName).toBe(name);
    const [live] = await db.select().from(deployments).where(eq(deployments.projectId, projectId));
    expect(live.config.slug).toBe(name);
  });

  it("refuses a name another project already uses", async () => {
    as(bob);
    const res = await publishingRoute.PATCH(req("PATCH", `/projects/${otherProjectId}/publishing`, { siteName: `shop-${suffix}` }), ctx({ id: otherProjectId }));
    expect(res.status).toBe(409);
  });

  it("refuses invalid names", async () => {
    as(alice);
    const res = await publishingRoute.PATCH(req("PATCH", `/projects/${projectId}/publishing`, { siteName: "No Spaces" }), ctx({ id: projectId }));
    expect(res.status).toBe(400);
  });

  it("takes the site offline and keeps the version in history", async () => {
    as(alice);
    const res = await unpublishRoute.POST(req("POST", `/projects/${projectId}/publishing/unpublish`), ctx({ id: projectId }));
    expect(res.status).toBe(200);
    const body = await read(res);
    expect(body.publishing.live).toBeNull();
    expect(body.publishing.offline).toBe(true);
    const rows = await db.select().from(deployments).where(eq(deployments.projectId, projectId));
    expect(rows.every((r) => r.status === "rolled_back")).toBe(true);
    const again = await unpublishRoute.POST(req("POST", `/projects/${projectId}/publishing/unpublish`), ctx({ id: projectId }));
    expect(again.status).toBe(400);
  });

  it("adds, verifies and removes a custom domain", async () => {
    as(alice);
    const domain = `www.pub-${suffix}.example.com`;
    const add = await domainsRoute.POST(req("POST", `/projects/${projectId}/domains`, { domain: `https://${domain}/` }), ctx({ id: projectId }));
    expect(add.status).toBe(201);
    const added = (await read(add)).domain;
    expect(added.domain).toBe(domain);
    expect(added.verified).toBe(false);
    const txt = added.records.find((r: { type: string }) => r.type === "TXT");
    expect(txt.name).toBe(`_codexa-challenge.${domain}`);

    const dup = await domainsRoute.POST(req("POST", `/projects/${projectId}/domains`, { domain }), ctx({ id: projectId }));
    expect(dup.status).toBe(409);

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    const dns = (answer: string[]) => (async () => new Response(JSON.stringify({ Answer: answer.map((data) => ({ type: 16, data: `"${data}"` })) }))) as unknown as typeof fetch;
    await expect(verifyDomain(project, aliceWs, alice, added.id, dns(["something-else"]))).rejects.toThrow(/not the expected value/);
    await expect(verifyDomain(project, aliceWs, alice, added.id, dns([]))).rejects.toThrow(/No TXT record/);
    const ok = await verifyDomain(project, aliceWs, alice, added.id, dns([txt.value]));
    expect(ok.verified).toBe(true);

    const del = await domainRoute.DELETE(req("DELETE", `/projects/${projectId}/domains/${added.id}`), ctx({ id: projectId, domainId: added.id }));
    expect(del.status).toBe(200);
  });

  it("reports page views from the Worker's daily counters", async () => {
    const today = new Date().toISOString().slice(0, 10);
    await db.insert(siteVisits).values({ projectId, day: today, views: 42 });
    as(alice);
    const body = await read(await publishingRoute.GET(req("GET", `/projects/${projectId}/publishing`), ctx({ id: projectId })));
    expect(body.analytics.total).toBe(42);
    expect(body.analytics.last7).toBe(42);
    expect(body.analytics.series.at(-1)).toEqual({ day: today, views: 42 });
  });
});
