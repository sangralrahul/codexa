/**
 * Postgres adapter + workspace connections + project database endpoints against the real test DB.
 * The stored connection points at the test database itself (TEST_DATABASE_URL), so the schema
 * inspection and query execution are exercised for real. requireApiUser() is mocked per request.
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
import { integrationConnections, users, workspaces, type User, type Workspace } from "@/db/schema";
import { createUserWithWorkspace } from "@/lib/auth/users";
import { createProject } from "@/lib/services/projects";
import { decryptSecret } from "@/lib/crypto";
import { testPostgres } from "@/lib/integrations/providers/postgres";
import { runQuery, ConfirmationRequiredError, DatabaseQueryError } from "@/lib/integrations/database";
import * as directoryRoute from "@/app/api/v1/integrations/route";
import * as connectionsRoute from "@/app/api/v1/workspaces/[id]/integrations/route";
import * as connectionRoute from "@/app/api/v1/workspaces/[id]/integrations/[cid]/route";
import * as testRoute from "@/app/api/v1/workspaces/[id]/integrations/[cid]/test/route";
import * as schemaRoute from "@/app/api/v1/projects/[id]/database/schema/route";
import * as queryRoute from "@/app/api/v1/projects/[id]/database/query/route";
import * as tokenRoute from "@/app/api/v1/projects/[id]/realtime-token/route";
import { verifyRealtimeToken } from "@/lib/integrations/realtime-token";

const DB_URL = process.env.DATABASE_URL!;
const suffix = Date.now().toString(36);
let owner: User;
let ws: Workspace;
let stranger: User;
let projectId: string;
let connectionId: string;
const TABLE = `itest_people_${suffix}`;

const B = "http://test.local/api/v1";
const ctx = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const req = (method: string, path: string, body?: unknown) =>
  new Request(`${B}${path}`, { method, headers: body !== undefined ? { "Content-Type": "application/json" } : {}, body: body !== undefined ? JSON.stringify(body) : undefined });
const as = (u: User) => {
  currentUser = u;
};
const j = async (r: Response) => ({ status: r.status, body: r.status === 204 ? null : await r.json() });

beforeAll(async () => {
  const a = await createUserWithWorkspace({ email: `dbowner-${suffix}@example.com`, password: "password123", name: "DB Owner" });
  owner = a.user;
  ws = a.workspace;
  stranger = (await createUserWithWorkspace({ email: `dbstranger-${suffix}@example.com`, password: "password123", name: "Stranger" })).user;
  const p = await createProject({ workspaceId: ws.id, name: `db-${suffix}`, templateId: "static-site", createdBy: owner.id });
  projectId = p.id;
});

afterAll(async () => {
  await db.execute(`drop table if exists "${TABLE}"`);
  for (const u of [owner, stranger]) if (u) await cleanupUser(u);
});

/** Delete a user's workspaces (cascading projects, activity, connections) and then the user. */
async function cleanupUser(u: User) {
  await db.delete(workspaces).where(eq(workspaces.ownerId, u.id));
  await db.delete(users).where(eq(users.id, u.id));
}

describe("postgres adapter (real connection)", () => {
  it("connects to the test database and reports version/user", async () => {
    const r = await testPostgres(DB_URL, false);
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/Connected to codexa_test as codexa/);
    expect(r.details?.version).toMatch(/PostgreSQL/);
  });
  it("fails fast with a safe message for bad credentials", async () => {
    const r = await testPostgres("postgres://codexa:wrong-password@127.0.0.1:5432/codexa_test", false);
    expect(r.ok).toBe(false);
    expect(r.message).not.toContain("wrong-password");
  });
  it("rejects destructive SQL unless confirmed, and runs reads in a read-only transaction", async () => {
    const conn = { connectionString: DB_URL, ssl: false };
    await expect(runQuery(conn, `drop table if exists "${TABLE}"`)).rejects.toBeInstanceOf(ConfirmationRequiredError);
    // A write inside a read-only statement classification is impossible, but a SELECT that tries to write fails.
    await expect(runQuery(conn, "select 1; select pg_sleep(0)")).resolves.toMatchObject({ readOnly: true });
    await expect(runQuery(conn, "selec 1")).rejects.toBeInstanceOf(DatabaseQueryError);
  });
});

describe("workspace connections API", () => {
  it("lists providers with platform flags and no connections for a fresh workspace", async () => {
    as(owner);
    const { status, body } = await j(await directoryRoute.GET(req("GET", `/integrations?workspaceId=${ws.id}`), {}));
    expect(status).toBe(200);
    const pg = body.providers.find((p: { id: string }) => p.id === "postgres");
    expect(pg).toMatchObject({ connectable: true, configured: null, category: "databases" });
    expect(body.providers.find((p: { id: string }) => p.id === "github").configured).toBe(false);
    expect(body.connections).toEqual([]);
  });
  it("strangers cannot read another workspace's directory connections", async () => {
    as(stranger);
    const r = await directoryRoute.GET(req("GET", `/integrations?workspaceId=${ws.id}`), {});
    expect(r.status).toBe(404);
  });
  it("creates a postgres connection with an encrypted secret that is never returned", async () => {
    as(owner);
    const { status, body } = await j(
      await connectionsRoute.POST(req("POST", `/workspaces/${ws.id}/integrations`, { provider: "postgres", name: "Test DB", config: { ssl: "false" }, secret: { connectionString: DB_URL } }), ctx({ id: ws.id })),
    );
    expect(status).toBe(201);
    connectionId = body.connection.id;
    expect(body.connection.config.connectionString).toBe("••••••••");
    expect(JSON.stringify(body)).not.toContain("codexa:codexa@");
    const [row] = await db.select().from(integrationConnections).where(eq(integrationConnections.id, connectionId));
    expect(row.secretEnc).toBeTruthy();
    expect(JSON.parse(decryptSecret(row.secretEnc!))).toEqual({ connectionString: DB_URL });
    expect(row.config).not.toHaveProperty("connectionString");
  });
  it("accepts a bare secret string for single-secret providers and validates required fields", async () => {
    as(owner);
    const r1 = await j(await connectionsRoute.POST(req("POST", `/workspaces/${ws.id}/integrations`, { provider: "postgres", name: "Bare", config: {}, secret: DB_URL }), ctx({ id: ws.id })));
    expect(r1.status).toBe(201);
    await connectionRoute.DELETE(req("DELETE", `/workspaces/${ws.id}/integrations/${r1.body.connection.id}`), ctx({ id: ws.id, cid: r1.body.connection.id }));
    const r2 = await j(await connectionsRoute.POST(req("POST", `/workspaces/${ws.id}/integrations`, { provider: "postgres", name: "Missing", config: {} }), ctx({ id: ws.id })));
    expect(r2.status).toBe(400);
    const r3 = await j(await connectionsRoute.POST(req("POST", `/workspaces/${ws.id}/integrations`, { provider: "postgres", name: "Bad", config: {}, secret: { connectionString: "mysql://x" } }), ctx({ id: ws.id })));
    expect(r3.status).toBe(400);
    expect(r3.body.error.message).toMatch(/postgres:\/\//);
    const r4 = await j(await connectionsRoute.POST(req("POST", `/workspaces/${ws.id}/integrations`, { provider: "slack", name: "Planned", config: {} }), ctx({ id: ws.id })));
    expect(r4.status).toBe(400);
  });
  it("tests the connection and persists status", async () => {
    as(owner);
    const { status, body } = await j(await testRoute.POST(req("POST", `/workspaces/${ws.id}/integrations/${connectionId}/test`), ctx({ id: ws.id, cid: connectionId })));
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.result.ok).toBe(true);
    expect(body.connection.status).toBe("connected");
    expect(body.connection.lastTestedAt).toBeTruthy();
    expect(body.connection.config.connectionString).toBe("••••••••");
  });
  it("requires admin to create/delete and membership to read", async () => {
    as(stranger);
    expect((await connectionsRoute.GET(req("GET", `/workspaces/${ws.id}/integrations`), ctx({ id: ws.id }))).status).toBe(404);
    expect((await connectionsRoute.POST(req("POST", `/workspaces/${ws.id}/integrations`, { provider: "postgres", name: "x", config: {}, secret: DB_URL }), ctx({ id: ws.id }))).status).toBe(404);
    expect((await connectionRoute.DELETE(req("DELETE", `/workspaces/${ws.id}/integrations/${connectionId}`), ctx({ id: ws.id, cid: connectionId }))).status).toBe(404);
    currentUser = null;
    expect((await connectionsRoute.GET(req("GET", `/workspaces/${ws.id}/integrations`), ctx({ id: ws.id }))).status).toBe(401);
  });
});

describe("project database endpoints", () => {
  it("creates a table through the query endpoint (write, no confirmation needed)", async () => {
    as(owner);
    const { status, body } = await j(
      await queryRoute.POST(req("POST", `/projects/${projectId}/database/query`, { connectionId, sql: `create table "${TABLE}" (id serial primary key, name text not null, age int); insert into "${TABLE}" (name, age) values ('Ada', 36), ('Linus', 54)` }), ctx({ id: projectId })),
    );
    expect(status).toBe(200);
    expect(body.readOnly).toBe(false);
    expect(body.command).toBe("INSERT");
    expect(body.rowCount).toBe(2);
  });
  it("inspects the schema with columns, primary keys and row estimates", async () => {
    as(owner);
    const { status, body } = await j(await schemaRoute.GET(req("GET", `/projects/${projectId}/database/schema?connectionId=${connectionId}`), ctx({ id: projectId })));
    expect(status).toBe(200);
    expect(body.connection).toMatchObject({ id: connectionId, provider: "postgres" });
    const t = body.tables.find((x: { name: string }) => x.name === TABLE);
    expect(t).toBeTruthy();
    expect(t.primaryKey).toEqual(["id"]);
    expect(t.columns.map((c: { name: string }) => c.name)).toEqual(["id", "name", "age"]);
    expect(t.columns[0]).toMatchObject({ isPrimaryKey: true, type: "integer", nullable: false });
    expect(t.columns[1]).toMatchObject({ type: "text", nullable: false });
    const projectsTable = body.tables.find((x: { name: string }) => x.name === "projects");
    expect(projectsTable.columns.find((c: { name: string }) => c.name === "workspace_id").foreignKey).toEqual({ table: "workspaces", column: "id" });
  });
  it("runs SELECTs read-only with fields/rows/duration", async () => {
    as(owner);
    const { status, body } = await j(await queryRoute.POST(req("POST", `/projects/${projectId}/database/query`, { connectionId, sql: `select name, age from "${TABLE}" order by age` }), ctx({ id: projectId })));
    expect(status).toBe(200);
    expect(body.readOnly).toBe(true);
    expect(body.fields.map((f: { name: string }) => f.name)).toEqual(["name", "age"]);
    expect(body.rows).toEqual([{ name: "Ada", age: 36 }, { name: "Linus", age: 54 }]);
    expect(typeof body.durationMs).toBe("number");
  });
  it("caps results at 500 rows and flags truncation", async () => {
    as(owner);
    const { body } = await j(await queryRoute.POST(req("POST", `/projects/${projectId}/database/query`, { connectionId, sql: "select generate_series(1, 700) as n" }), ctx({ id: projectId })));
    expect(body.rows).toHaveLength(500);
    expect(body.truncated).toBe(true);
    expect(body.rowCount).toBe(700);
  });
  it("requires confirmation for destructive statements and honours confirmDestructive", async () => {
    as(owner);
    const denied = await j(await queryRoute.POST(req("POST", `/projects/${projectId}/database/query`, { connectionId, sql: `delete from "${TABLE}"` }), ctx({ id: projectId })));
    expect(denied.status).toBe(409);
    expect(denied.body.error.code).toBe("confirmation_required");
    expect(denied.body.error.details.reason).toMatch(/WHERE/);
    const still = await j(await queryRoute.POST(req("POST", `/projects/${projectId}/database/query`, { connectionId, sql: `select count(*)::int as c from "${TABLE}"` }), ctx({ id: projectId })));
    expect(still.body.rows[0].c).toBe(2);
    const ok = await j(await queryRoute.POST(req("POST", `/projects/${projectId}/database/query`, { connectionId, sql: `delete from "${TABLE}"`, confirmDestructive: true }), ctx({ id: projectId })));
    expect(ok.status).toBe(200);
    expect(ok.body.rowCount).toBe(2);
  });
  it("returns SQL errors as 422 without leaking credentials", async () => {
    as(owner);
    const { status, body } = await j(await queryRoute.POST(req("POST", `/projects/${projectId}/database/query`, { connectionId, sql: "select * from table_that_does_not_exist" }), ctx({ id: projectId })));
    expect(status).toBe(422);
    expect(body.error.message).toMatch(/does not exist/);
    expect(body.error.message).not.toContain("codexa:codexa");
  });
  it("rejects connections from other workspaces and enforces roles", async () => {
    const other = await createUserWithWorkspace({ email: `dbother-${suffix}@example.com`, password: "password123", name: "Other" });
    try {
      as(other.user);
      const { body: created } = await j(await connectionsRoute.POST(req("POST", `/workspaces/${other.workspace.id}/integrations`, { provider: "postgres", name: "Other DB", config: {}, secret: DB_URL }), ctx({ id: other.workspace.id })));
      as(owner);
      const cross = await queryRoute.POST(req("POST", `/projects/${projectId}/database/query`, { connectionId: created.connection.id, sql: "select 1" }), ctx({ id: projectId }));
      expect(cross.status).toBe(404);
      const missing = await schemaRoute.GET(req("GET", `/projects/${projectId}/database/schema`), ctx({ id: projectId }));
      expect(missing.status).toBe(400);
      as(stranger);
      expect((await schemaRoute.GET(req("GET", `/projects/${projectId}/database/schema?connectionId=${connectionId}`), ctx({ id: projectId }))).status).toBe(404);
    } finally {
      await cleanupUser(other.user);
    }
  });
  it("issues a verifiable realtime token for members only", async () => {
    as(owner);
    const { status, body } = await j(await tokenRoute.GET(req("GET", `/projects/${projectId}/realtime-token`), ctx({ id: projectId })));
    expect(status).toBe(200);
    const payload = verifyRealtimeToken(body.token, process.env.SESSION_SECRET!);
    expect(payload).toMatchObject({ projectId, userId: owner.id, name: "DB Owner" });
    expect(body.self.color).toMatch(/^#/);
    as(stranger);
    expect((await tokenRoute.GET(req("GET", `/projects/${projectId}/realtime-token`), ctx({ id: projectId }))).status).toBe(404);
  });
  it("deletes the connection (admin) and reports 404 afterwards", async () => {
    as(owner);
    expect((await connectionRoute.DELETE(req("DELETE", `/workspaces/${ws.id}/integrations/${connectionId}`), ctx({ id: ws.id, cid: connectionId }))).status).toBe(204);
    expect((await connectionRoute.GET(req("GET", `/workspaces/${ws.id}/integrations/${connectionId}`), ctx({ id: ws.id, cid: connectionId }))).status).toBe(404);
    expect((await schemaRoute.GET(req("GET", `/projects/${projectId}/database/schema?connectionId=${connectionId}`), ctx({ id: projectId }))).status).toBe(404);
  });
});
