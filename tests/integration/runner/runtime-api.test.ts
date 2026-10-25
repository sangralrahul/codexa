/**
 * Route-level tests for the runtime and deployment APIs against the real test
 * database and an in-process runner (local sandbox driver). requireApiUser()
 * is mocked so requests run as a chosen user; access checks, quotas, usage
 * accounting, the runner client and the sandbox itself are exercised for real.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import type { User, Workspace, Project } from "@/db/schema";

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

const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
const BASE_DIR = path.join(process.env.RUNNER_DATA_DIR || "/var/codexa", "base");
const hasBase = await fs
  .stat(path.join(BASE_DIR, "vite-react", "node_modules"))
  .then((s) => s.isDirectory())
  .catch(() => false);
const canRun = process.platform === "linux" && isRoot && hasBase;
const TOKEN = "test-runner-token-next";

// Point the Next.js runner client at the in-process runner BEFORE @/lib/env is evaluated.
process.env.RUNNER_TOKEN = TOKEN;
process.env.PREVIEW_HOST = "preview.test:4100";
process.env.DEPLOY_HOST = "sites.test:4100";

type Routes = {
  runtime: typeof import("@/app/api/v1/projects/[id]/runtime/route");
  start: typeof import("@/app/api/v1/projects/[id]/runtime/start/route");
  stop: typeof import("@/app/api/v1/projects/[id]/runtime/stop/route");
  logs: typeof import("@/app/api/v1/projects/[id]/runtime/logs/route");
  sync: typeof import("@/app/api/v1/projects/[id]/runtime/sync/route");
  exec: typeof import("@/app/api/v1/projects/[id]/runtime/exec/route");
  deployments: typeof import("@/app/api/v1/projects/[id]/deployments/route");
  deployment: typeof import("@/app/api/v1/projects/[id]/deployments/[did]/route");
  rollback: typeof import("@/app/api/v1/projects/[id]/deployments/[did]/rollback/route");
  status: typeof import("@/app/api/v1/status/route");
};

let app: import("../../../services/runner/app").RunnerApp;
let dataDir: string;
let routes: Routes;
let db: typeof import("@/db").db;
let schema: typeof import("@/db/schema");
let execInProject: typeof import("@/lib/runtime/exec").execInProject;
let getRuntimeStatus: typeof import("@/lib/runtime/exec").getRuntimeStatus;
let getRuntimeLogs: typeof import("@/lib/runtime/exec").getRuntimeLogs;

const suffix = Date.now().toString(36);
let alice: User;
let aliceWs: Workspace;
let bob: User;
let bobWs: Workspace;
let staticProject: Project;
let viteProject: Project;

const B = "http://test.local/api/v1";
const ctx = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const req = (method: string, p: string, body?: unknown) =>
  new Request(`${B}${p}`, { method, headers: body !== undefined ? { "Content-Type": "application/json" } : {}, body: body !== undefined ? JSON.stringify(body) : undefined });
const as = (u: User | null) => {
  currentUser = u;
};
const proxyGet = (host: string, p = "/") =>
  new Promise<{ status: number; text: string }>((resolve, reject) => {
    const r = http.request({ host: "127.0.0.1", port: app.proxyPort, path: p, headers: { host } }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString("utf8") }));
    });
    r.on("error", reject);
    r.end();
  });
const hostOf = (url: string) => new URL(url).host;

async function waitRunning(projectId: string, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let last: { session: { status: string; previewUrl: string | null; error: string | null } | null } = { session: null };
  while (Date.now() < deadline) {
    const res = await routes.runtime.GET(req("GET", `/projects/${projectId}/runtime`), ctx({ id: projectId }));
    last = await res.json();
    if (last.session?.status === "running" || last.session?.status === "error") return last.session;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`runtime not running: ${JSON.stringify(last)}`);
}

beforeAll(async () => {
  if (!canRun) return;
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "codexa-runtime-api-test-"));
  await fs.chmod(dataDir, 0o755);
  const { createRunner } = await import("../../../services/runner/app");
  app = await createRunner({
    port: 0,
    previewPort: 0,
    token: TOKEN,
    dataDir,
    sandboxesDir: path.join(dataDir, "sandboxes"),
    sitesDir: path.join(dataDir, "sites"),
    binDir: path.join(dataDir, "bin"),
    baseDir: BASE_DIR,
    portRange: [32000, 32999],
    previewHost: "preview.test",
    deployHost: "sites.test",
    publicPreviewPort: 4100,
    reapOrphans: false, // never touch the live runner's cgroups
  });
  process.env.RUNNER_URL = `http://127.0.0.1:${app.apiPort}`;

  ({ db } = await import("@/db"));
  schema = await import("@/db/schema");
  ({ execInProject, getRuntimeStatus, getRuntimeLogs } = await import("@/lib/runtime/exec"));
  routes = {
    runtime: await import("@/app/api/v1/projects/[id]/runtime/route"),
    start: await import("@/app/api/v1/projects/[id]/runtime/start/route"),
    stop: await import("@/app/api/v1/projects/[id]/runtime/stop/route"),
    logs: await import("@/app/api/v1/projects/[id]/runtime/logs/route"),
    sync: await import("@/app/api/v1/projects/[id]/runtime/sync/route"),
    exec: await import("@/app/api/v1/projects/[id]/runtime/exec/route"),
    deployments: await import("@/app/api/v1/projects/[id]/deployments/route"),
    deployment: await import("@/app/api/v1/projects/[id]/deployments/[did]/route"),
    rollback: await import("@/app/api/v1/projects/[id]/deployments/[did]/rollback/route"),
    status: await import("@/app/api/v1/status/route"),
  };
  const { createUserWithWorkspace } = await import("@/lib/auth/users");
  const { createProject } = await import("@/lib/services/projects");
  ({ user: alice, workspace: aliceWs } = await createUserWithWorkspace({ email: `runner-alice-${suffix}@test.local`, name: "Alice", emailVerified: true }));
  ({ user: bob, workspace: bobWs } = await createUserWithWorkspace({ email: `runner-bob-${suffix}@test.local`, name: "Bob", emailVerified: true }));
  await db.insert(schema.workspaceMembers).values({ workspaceId: aliceWs.id, userId: bob.id, role: "viewer" });
  staticProject = await createProject({ workspaceId: aliceWs.id, name: "Static smoke", templateId: "static-site", createdBy: alice.id });
  viteProject = await createProject({ workspaceId: aliceWs.id, name: "Vite smoke", templateId: "vite-react-starter", createdBy: alice.id });
}, 120_000);

afterAll(async () => {
  if (!canRun) return;
  try {
    // Always stop the sandboxes first: a failing DB cleanup must not leave processes behind.
    await app?.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  } finally {
    // deployments.created_by does not cascade from users: remove the test projects' rows first.
    if (aliceWs) await db.delete(schema.projects).where(eq(schema.projects.workspaceId, aliceWs.id));
    for (const ws of [aliceWs, bobWs]) if (ws) await db.delete(schema.workspaces).where(eq(schema.workspaces.id, ws.id));
    for (const u of [alice, bob]) if (u) await db.delete(schema.users).where(eq(schema.users.id, u.id));
  }
});

describe.skipIf(!canRun)("runtime API", () => {
  it("reports the runner as available and the project as not running", async () => {
    as(alice);
    const res = await routes.runtime.GET(req("GET", `/projects/${staticProject.id}/runtime`), ctx({ id: staticProject.id }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ session: null, runnerAvailable: true, runnerError: null, runnerConfigured: true, runnerSetupHint: null });
    as(null);
    expect((await routes.runtime.GET(req("GET", "/x"), ctx({ id: staticProject.id }))).status).toBe(401);
    as(bob);
    expect((await routes.start.POST(req("POST", "/x"), ctx({ id: staticProject.id }))).status).toBe(403); // viewer cannot start
    expect((await routes.runtime.GET(req("GET", "/x"), ctx({ id: staticProject.id }))).status).toBe(200); // but can look
  });

  it("starts a runtime, serves the preview, syncs edits, runs allowlisted commands, streams logs and stops", async () => {
    as(alice);
    const start = await routes.start.POST(req("POST", "/x"), ctx({ id: staticProject.id }));
    expect(start.status).toBe(201);
    const { session } = (await start.json()) as { session: { id: string; status: string; previewUrl: string } };
    expect(session.status).toBe("starting");
    expect(session.previewUrl).toMatch(/^http:\/\/[a-f0-9]{24}\.preview\.test:4100\/$/);
    const [row] = await db.select().from(schema.runtimeSessions).where(eq(schema.runtimeSessions.id, session.id));
    expect(row.previewToken).toHaveLength(24);
    expect(row.runnerSessionId).toBeTruthy();

    const running = await waitRunning(staticProject.id);
    expect(running.status).toBe("running");
    const page = await proxyGet(hostOf(session.previewUrl));
    expect(page.status).toBe(200);
    expect(page.text).toContain("<!doctype html>");

    // Starting again is idempotent (200, same session) and the response never contains env vars.
    const again = await routes.start.POST(req("POST", "/x"), ctx({ id: staticProject.id }));
    expect(again.status).toBe(200);
    expect(((await again.json()) as { session: { id: string } }).session.id).toBe(session.id);

    // One concurrent runtime on the free plan: a second project is refused with 402.
    const second = await routes.start.POST(req("POST", "/x"), ctx({ id: viteProject.id }));
    expect(second.status).toBe(402);
    expect(((await second.json()) as { error: { code: string } }).error.code).toBe("quota_exceeded");

    // Edit in the DB → sync → visible through the preview.
    const { writeFile } = await import("@/lib/services/projects");
    await writeFile(staticProject.id, "index.html", "<!doctype html><h1>Edited via sync</h1>");
    const sync = await routes.sync.POST(req("POST", "/x", { paths: ["index.html", "ghost.txt"] }), ctx({ id: staticProject.id }));
    expect(await sync.json()).toEqual({ synced: true, written: 1, deleted: 1 }); // ghost.txt is not in the DB → removed from the sandbox
    expect((await proxyGet(hostOf(session.previewUrl))).text).toContain("Edited via sync");
    expect((await routes.sync.POST(req("POST", "/x", { paths: [123] }), ctx({ id: staticProject.id }))).status).toBe(400);

    // Exec: allowlist enforced by zod; static projects skip build.
    expect((await routes.exec.POST(req("POST", "/x", { command: "sh" }), ctx({ id: staticProject.id }))).status).toBe(400);
    const build = await routes.exec.POST(req("POST", "/x", { command: "build" }), ctx({ id: staticProject.id }));
    expect(build.status).toBe(200);
    expect(((await build.json()) as { skipped: boolean; exitCode: number }).skipped).toBe(true);
    as(bob);
    expect((await routes.exec.POST(req("POST", "/x", { command: "build" }), ctx({ id: staticProject.id }))).status).toBe(403);
    as(alice);

    // Logs: JSON tail and SSE relay.
    const tail = await routes.logs.GET(req("GET", `/projects/${staticProject.id}/runtime/logs?tail=5`), ctx({ id: staticProject.id }));
    const tailBody = (await tail.json()) as { lines: { line: string }[]; status: string };
    expect(tailBody.status).toBe("running");
    expect(tailBody.lines.length).toBeGreaterThan(0);
    const ac = new AbortController();
    const sse = await routes.logs.GET(new Request(`${B}/projects/${staticProject.id}/runtime/logs`, { signal: ac.signal }), ctx({ id: staticProject.id }));
    expect(sse.headers.get("content-type")).toContain("text/event-stream");
    const reader = sse.body!.getReader();
    let text = "";
    while (!text.includes("event: status")) {
      const { value, done } = await reader.read();
      if (done) break;
      text += new TextDecoder().decode(value);
    }
    expect(text).toContain("event: log");
    expect(text).toContain('"status":"running"');
    ac.abort();
    await reader.cancel().catch(() => {});

    // Server-side contract used by the AI engine.
    expect(await getRuntimeStatus(staticProject.id)).toMatchObject({ available: true, status: "running" });
    expect((await getRuntimeLogs(staticProject.id, { lines: 3 })).lines).toHaveLength(3);
    const exec = await execInProject(staticProject.id, "typecheck");
    expect(exec.available).toBe(true);
    expect(exec.exitCode).toBe(0);

    // Stop: row closed out, usage recorded, runner session gone.
    const stop = await routes.stop.POST(req("POST", "/x"), ctx({ id: staticProject.id }));
    const stopped = ((await stop.json()) as { session: { status: string; stoppedAt: string | null } }).session;
    expect(stopped.status).toBe("stopped");
    expect(stopped.stoppedAt).toBeTruthy();
    expect(app.sessions.list()).toHaveLength(0);
    const usage = await db.select().from(schema.usageEvents).where(and(eq(schema.usageEvents.workspaceId, aliceWs.id), eq(schema.usageEvents.kind, "runtime_minutes")));
    expect(usage.length).toBeGreaterThanOrEqual(1);
    expect(usage[0].quantity).toBeGreaterThanOrEqual(1);
    const activity = await db.select().from(schema.projectActivity).where(eq(schema.projectActivity.projectId, staticProject.id));
    expect(activity.map((a) => a.kind)).toEqual(expect.arrayContaining(["runtime.started", "runtime.stopped", "runtime.exec"]));
    expect((await proxyGet(hostOf(session.previewUrl))).status).toBe(404);
    expect((await routes.stop.POST(req("POST", "/x"), ctx({ id: staticProject.id }))).status).toBe(200); // idempotent
  }, 120_000);

  it("execInProject starts a runtime on demand (vite project, typecheck) and marks runner-stopped sessions", async () => {
    as(alice);
    const r = await execInProject(viteProject.id, "typecheck", { userId: alice.id });
    expect(r.available).toBe(true);
    expect(r.exitCode, r.output).toBe(0);
    expect(r.timedOut).toBe(false);
    const state = await getRuntimeStatus(viteProject.id);
    expect(["running", "starting"]).toContain(state.status);
    // Simulate the runner's idle sweeper killing the sandbox: the next status read reconciles the DB row.
    await app.sessions.stopAll();
    const res = await routes.runtime.GET(req("GET", "/x"), ctx({ id: viteProject.id }));
    const body = (await res.json()) as { session: { status: string; error: string | null } };
    expect(body.session.status).toBe("stopped");
    expect(body.session.error).toMatch(/stopped by the runner/);
  }, 120_000);

  it("deploys to Codexa hosting, lists history with build logs, supersedes and rolls back", async () => {
    as(alice);
    const list0 = await routes.deployments.GET(req("GET", "/x"), ctx({ id: staticProject.id }));
    const l0 = (await list0.json()) as { deployments: unknown[]; providers: { id: string; available: boolean; reason: string | null }[]; domain: { host: string; cname: string; verificationSupported: boolean } };
    expect(l0.deployments).toEqual([]);
    expect(l0.providers.find((p) => p.id === "codexa")?.available).toBe(true);
    const vercel = l0.providers.find((p) => p.id === "vercel");
    expect(vercel?.available).toBe(Boolean(process.env.VERCEL_TOKEN));
    if (!vercel?.available) expect(vercel?.reason).toMatch(/VERCEL_TOKEN/);
    expect(l0.domain.host).toMatch(/\.sites\.test:4100$/);
    expect(l0.domain.verificationSupported).toBe(false);

    as(bob);
    expect((await routes.deployments.POST(req("POST", "/x", { provider: "codexa" }), ctx({ id: staticProject.id }))).status).toBe(403);
    as(alice);
    expect((await routes.deployments.POST(req("POST", "/x", { provider: "netlify" }), ctx({ id: staticProject.id }))).status).toBe(400);

    const first = await routes.deployments.POST(req("POST", "/x", { provider: "codexa", wait: true }), ctx({ id: staticProject.id }));
    expect(first.status).toBe(201);
    const d1 = ((await first.json()) as { deployment: { id: string; status: string; url: string; buildLog: string; snapshotId: string } }).deployment;
    expect(d1.status).toBe("live");
    expect(d1.url).toMatch(/^http:\/\/[a-z0-9-]+\.sites\.test:4100\/$/);
    expect(d1.buildLog).toContain("Live at");
    expect(d1.snapshotId).toBeTruthy();
    const site = await proxyGet(hostOf(d1.url));
    expect(site.status).toBe(200);
    expect(site.text).toContain("Edited via sync");
    const [snap] = await db.select().from(schema.projectSnapshots).where(eq(schema.projectSnapshots.id, d1.snapshotId));
    expect(snap.kind).toBe("deploy");

    const { writeFile } = await import("@/lib/services/projects");
    await writeFile(staticProject.id, "index.html", "<!doctype html><h1>Version two</h1>");
    const second = await routes.deployments.POST(req("POST", "/x", { provider: "codexa", wait: true }), ctx({ id: staticProject.id }));
    const d2 = ((await second.json()) as { deployment: { id: string; status: string; url: string } }).deployment;
    expect(d2.status).toBe("live");
    expect((await proxyGet(hostOf(d2.url))).text).toContain("Version two");

    const list = await routes.deployments.GET(req("GET", "/x"), ctx({ id: staticProject.id }));
    const rows = ((await list.json()) as { deployments: { id: string; status: string; buildLog?: string }[] }).deployments;
    expect(rows.map((r) => [r.id, r.status])).toEqual([
      [d2.id, "live"],
      [d1.id, "rolled_back"],
    ]);
    expect(rows[0].buildLog).toBeUndefined(); // list omits logs
    const one = await routes.deployment.GET(req("GET", "/x"), ctx({ id: staticProject.id, did: d1.id }));
    expect(((await one.json()) as { deployment: { buildLog: string } }).deployment.buildLog).toContain("Published");
    expect((await routes.deployment.GET(req("GET", "/x"), ctx({ id: viteProject.id, did: d1.id }))).status).toBe(404); // scoped to project

    // Rollback needs admin/owner; viewers are refused. Afterwards the old content is live again.
    as(bob);
    expect((await routes.rollback.POST(req("POST", "/x"), ctx({ id: staticProject.id, did: d1.id }))).status).toBe(403);
    as(alice);
    const rb = await routes.rollback.POST(req("POST", "/x"), ctx({ id: staticProject.id, did: d1.id }));
    expect(rb.status).toBe(200);
    expect(((await rb.json()) as { deployment: { status: string } }).deployment.status).toBe("live");
    expect((await proxyGet(hostOf(d1.url))).text).toContain("Edited via sync");
    const after = ((await (await routes.deployments.GET(req("GET", "/x"), ctx({ id: staticProject.id }))).json()) as { deployments: { id: string; status: string }[] }).deployments;
    expect(after.find((r) => r.id === d2.id)?.status).toBe("rolled_back");

    const usage = await db.select().from(schema.usageEvents).where(and(eq(schema.usageEvents.workspaceId, aliceWs.id), eq(schema.usageEvents.kind, "deployment")));
    expect(usage).toHaveLength(2);
    const activity = await db.select().from(schema.projectActivity).where(eq(schema.projectActivity.projectId, staticProject.id));
    expect(activity.map((a) => a.kind)).toEqual(expect.arrayContaining(["deployment.queued", "deployment.live", "deployment.rolled_back"]));
  }, 180_000);

  it("records failed builds with their log and refuses server frameworks on Codexa hosting", async () => {
    as(alice);
    const { writeFile } = await import("@/lib/services/projects");
    await writeFile(viteProject.id, "src/App.tsx", "export default function App() { return <h1>{missing}</h1> }");
    const res = await routes.deployments.POST(req("POST", "/x", { provider: "codexa", wait: true }), ctx({ id: viteProject.id }));
    expect(res.status).toBe(201);
    const d = ((await res.json()) as { deployment: { status: string; error: string | null; buildLog: string } }).deployment;
    expect(d.status).toBe("failed");
    expect(d.error).toMatch(/Build failed/);
    expect(d.buildLog).toMatch(/missing/);

    const { createProject } = await import("@/lib/services/projects");
    const api = await createProject({ workspaceId: aliceWs.id, name: "API", templateId: "node-express-api", createdBy: alice.id }).catch(() => null);
    if (api) {
      const r = await routes.deployments.POST(req("POST", "/x", { provider: "codexa", wait: true }), ctx({ id: api.id }));
      expect(r.status).toBe(400);
      expect(((await r.json()) as { error: { message: string } }).error.message).toMatch(/static/);
    }
  }, 180_000);

  it("public status endpoint reports db + runner + configuration without secrets", async () => {
    as(null);
    const res = await routes.status.GET(req("GET", "/status"), undefined);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { overall: string; components: { id: string; state: string }[] };
    const byId = Object.fromEntries(body.components.map((c) => [c.id, c.state]));
    expect(byId.database).toBe("operational");
    expect(byId.runner).toBe("operational");
    expect(["not_configured", "unknown"]).toContain(byId.ai);
    expect(["not_configured", "unknown"]).toContain(byId.email);
    expect(JSON.stringify(body)).not.toContain(TOKEN);
  });
});

describe.skipIf(canRun)("runtime API (skipped)", () => {
  it("needs Linux, root and prepared base sets", () => {
    expect(canRun).toBe(false);
  });
});
