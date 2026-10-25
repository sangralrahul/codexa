/**
 * End-to-end test of the runner service, started in-process on ephemeral
 * ports with its own data directory. It uses the real local sandbox driver
 * (user/mount/pid namespaces, cgroups), so it needs Linux + root + the
 * prebuilt base sets from `npm run runner:prepare`. It is skipped otherwise.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createRunner, type RunnerApp } from "../../../services/runner/app";
import { viteReactTemplates } from "../../../src/templates/vite-react";
import { staticTemplates } from "../../../src/templates/static";

const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
const BASE_DIR = path.join(process.env.RUNNER_DATA_DIR || "/var/codexa", "base");
const hasBase = await fs
  .stat(path.join(BASE_DIR, "vite-react", "node_modules"))
  .then((s) => s.isDirectory())
  .catch(() => false);
const canRun = process.platform === "linux" && isRoot && hasBase;
const TOKEN = "test-runner-token";

let app: RunnerApp;
let dataDir: string;

function request(method: string, p: string, body?: unknown, opts: { token?: string | null; port?: number; host?: string; raw?: boolean; headers?: Record<string, string> } = {}) {
  const port = opts.port ?? app.apiPort;
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.token !== null) headers.authorization = `Bearer ${opts.token ?? TOKEN}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  if (opts.host) headers.host = opts.host;
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; text: string; json: () => unknown }>((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, method, path: p, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve({ status: res.statusCode ?? 0, headers: res.headers, text, json: () => JSON.parse(text) });
      });
    });
    req.on("error", reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

const proxyGet = (host: string, p = "/", headers: Record<string, string> = {}) => request("GET", p, undefined, { port: app.proxyPort, host, token: null, headers });

async function waitFor(id: string, want: string[], timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < deadline) {
    const r = await request("GET", `/sessions/${id}`);
    last = (r.json() as { session: { status: string; error: string | null } }).session.status;
    if (want.includes(last)) return last;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`session ${id} is "${last}" after ${timeoutMs}ms`);
}

/** Read an SSE stream for a bit and return the parsed events. */
function readSse(id: string, ms: number) {
  return new Promise<{ event: string; data: unknown }[]>((resolve, reject) => {
    const events: { event: string; data: unknown }[] = [];
    const req = http.request({ host: "127.0.0.1", port: app.apiPort, path: `/sessions/${id}/logs`, headers: { authorization: `Bearer ${TOKEN}` } }, (res) => {
      expect(res.headers["content-type"]).toContain("text/event-stream");
      let buf = "";
      res.setEncoding("utf8");
      res.on("data", (c: string) => {
        buf += c;
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          const ev = /^event: (.+)$/m.exec(p)?.[1];
          const data = /^data: (.+)$/m.exec(p)?.[1];
          if (ev && data) events.push({ event: ev, data: JSON.parse(data) });
        }
      });
      setTimeout(() => {
        req.destroy();
        resolve(events);
      }, ms);
    });
    req.on("error", (e) => (events.length ? resolve(events) : reject(e)));
    req.end();
  });
}

beforeAll(async () => {
  if (!canRun) return;
  // The sandbox uid must be able to traverse into its sandbox: use the world-traversable system tmp dir.
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "codexa-runner-test-"));
  await fs.chmod(dataDir, 0o755);
  app = await createRunner({
    port: 0,
    previewPort: 0,
    token: TOKEN,
    dataDir,
    sandboxesDir: path.join(dataDir, "sandboxes"),
    sitesDir: path.join(dataDir, "sites"),
    binDir: path.join(dataDir, "bin"),
    baseDir: BASE_DIR,
    portRange: [31000, 31999],
    previewHost: "preview.test",
    deployHost: "sites.test",
    publicPreviewPort: 4100,
    reapOrphans: false, // never touch the live runner's cgroups
  });
}, 60_000);

afterAll(async () => {
  if (!app) return;
  try {
    await app.close();
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

describe.skipIf(!canRun)("runner service (in-process, local sandbox driver)", () => {
  it("health is open, everything else needs the bearer token", async () => {
    const h = await request("GET", "/health", undefined, { token: null });
    expect(h.status).toBe(200);
    const health = h.json() as { ok: boolean; driver: { driver: string }; baseSets: Record<string, string> };
    expect(health.ok).toBe(true);
    expect(health.driver.driver).toBe("local");
    expect(Object.keys(health.baseSets)).toContain("vite-react");
    expect((await request("GET", "/sessions", undefined, { token: null })).status).toBe(401);
    expect((await request("GET", "/sessions", undefined, { token: "wrong" })).status).toBe(401);
    expect((await request("GET", "/nope")).status).toBe(404);
  });

  it("validates session input", async () => {
    const bad = await request("POST", "/sessions", { projectId: "p", framework: "php", files: {}, previewToken: "a".repeat(20) });
    expect(bad.status).toBe(400);
    const badToken = await request("POST", "/sessions", { projectId: "p", framework: "static", files: {}, previewToken: "short" });
    expect(badToken.status).toBe(400);
    const badFiles = await request("POST", "/sessions", { projectId: "p", framework: "static", files: { "../x": "y" }, previewToken: "a".repeat(20) });
    expect(badFiles.status).toBe(400);
    expect((badFiles.json() as { error: { message: string } }).error.message).toMatch(/\.\.\/x/);
  });

  it("runs a static project: create → preview through the proxy → sync → logs → stop", async () => {
    const token = "statictoken0123456789";
    const files = { ...staticTemplates[0].files, "index.html": "<!doctype html><title>t</title><h1>Static one</h1>" };
    const created = await request("POST", "/sessions", { projectId: "proj-static", framework: "static", settings: {}, files, env: { SECRET_THING: "abc" }, previewToken: token });
    expect(created.status).toBe(200);
    const { id, previewUrl, port } = created.json() as { id: string; previewUrl: string; port: number };
    expect(previewUrl).toBe(`http://${token}.preview.test:4100/`);
    expect(port).toBeGreaterThanOrEqual(31000);
    expect(await waitFor(id, ["running", "error"], 30_000)).toBe("running");

    const page = await proxyGet(`${token}.preview.test:4100`);
    expect(page.status).toBe(200);
    expect(page.text).toContain("Static one");
    expect(page.headers["x-content-type-options"]).toBe("nosniff");

    // File sync is reflected immediately (no build step for static sites); deletes work too.
    const sync = await request("PUT", `/sessions/${id}/files`, { files: { "index.html": "<h1>Static two</h1>", "extra.txt": "x" }, deletes: ["styles.css"] });
    expect(sync.status).toBe(200);
    expect(sync.json()).toEqual({ written: 2, deleted: 1 });
    expect((await proxyGet(`${token}.preview.test:4100`)).text).toContain("Static two");
    expect((await proxyGet(`${token}.preview.test:4100`, "/styles.css")).status).toBe(404);
    expect((await request("PUT", `/sessions/${id}/files`, { deletes: ["../../etc"] })).status).toBe(400);

    // The sandbox cannot see the runner's own files (its root is a minimal pivot_root).
    expect((await proxyGet(`${token}.preview.test:4100`, "/../../../etc/passwd")).status).not.toBe(200);

    // Exec: allowlist only; install/build do not apply to static projects.
    expect((await request("POST", `/sessions/${id}/exec`, { command: "rm -rf /" })).status).toBe(400);
    const build = (await request("POST", `/sessions/${id}/exec`, { command: "build" })).json() as { skipped: boolean; exitCode: number };
    expect(build.skipped).toBe(true);
    expect(build.exitCode).toBe(0);

    const tail = (await request("GET", `/sessions/${id}/logs?tail=50`)).json() as { lines: { stream: string; line: string }[] };
    expect(tail.lines.some((l) => l.stream === "system" && /Materialised/.test(l.line))).toBe(true);
    expect(tail.lines.some((l) => /Preview ready/.test(l.line))).toBe(true);
    expect(tail.lines.map((l) => l.line).join("\n")).not.toContain("abc"); // env values never logged

    const events = await readSse(id, 800);
    expect(events.some((e) => e.event === "log")).toBe(true);
    expect(events.some((e) => e.event === "status" && (e.data as { status: string }).status === "running")).toBe(true);

    const stopped = await request("DELETE", `/sessions/${id}`);
    expect(stopped.status).toBe(200);
    expect((await request("GET", `/sessions/${id}`)).status).toBe(404);
    expect((await proxyGet(`${token}.preview.test:4100`)).status).toBe(404);
    await expect(fs.stat(path.join(dataDir, "sandboxes", id))).rejects.toThrow();
  }, 90_000);

  it("runs a vite-react project with the prebuilt base set: HMR server, typecheck, WebSocket upgrade", async () => {
    const token = "vitetoken0123456789xyz";
    const tpl = viteReactTemplates[0];
    const created = await request("POST", "/sessions", { projectId: "proj-vite", framework: "vite-react", settings: tpl.settings, files: tpl.files, env: {}, previewToken: token });
    expect(created.status).toBe(200);
    const { id } = created.json() as { id: string };
    expect(await waitFor(id, ["running", "error"], 90_000)).toBe("running");

    const page = await proxyGet(`${token}.preview.test`);
    expect(page.status).toBe(200);
    expect(page.text).toContain("/@vite/client");
    expect((await proxyGet(`${token}.preview.test`, "/src/main.tsx")).status).toBe(200);

    const tc = (await request("POST", `/sessions/${id}/exec`, { command: "typecheck" })).json() as { exitCode: number; skipped: boolean; timedOut: boolean };
    expect(tc.skipped).toBe(false);
    expect(tc.timedOut).toBe(false);
    expect(tc.exitCode).toBe(0);

    await request("PUT", `/sessions/${id}/files`, { files: { "src/App.tsx": "export default function App() { const n: number = 'oops'; return <h1>{n}</h1> }" } });
    const tc2 = (await request("POST", `/sessions/${id}/exec`, { command: "typecheck" })).json() as { exitCode: number; output: string };
    expect(tc2.exitCode).not.toBe(0);
    expect(tc2.output).toMatch(/TS2322|not assignable/);

    // WebSocket upgrade through the proxy reaches Vite's HMR endpoint.
    const ws = await new Promise<string>((resolve, reject) => {
      const req = http.request({ host: "127.0.0.1", port: app.proxyPort, path: "/", headers: { host: `${token}.preview.test`, connection: "Upgrade", upgrade: "websocket", "sec-websocket-version": "13", "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==", "sec-websocket-protocol": "vite-hmr" } });
      req.on("upgrade", (res, socket) => {
        socket.destroy();
        resolve(String(res.statusCode));
      });
      req.on("response", (res) => resolve(`no-upgrade:${res.statusCode}`));
      req.on("error", reject);
      req.end();
    });
    expect(ws).toBe("101");

    expect((await request("DELETE", `/sessions/${id}`)).status).toBe(200);
  }, 150_000);

  it("sweeper stops idle and old sessions", async () => {
    const token = "sweeptoken0123456789a";
    const created = await request("POST", "/sessions", { projectId: "proj-sweep", framework: "static", files: { "index.html": "x" }, previewToken: token });
    const { id } = created.json() as { id: string };
    expect(await app.sessions.sweep(Date.now())).toEqual([]);
    const stopped = await app.sessions.sweep(Date.now() + app.cfg.limits.idleTimeoutMs + 1000);
    expect(stopped).toEqual([id]);
    expect(app.sessions.get(id)).toBeUndefined();
  }, 30_000);

  it("deploys a static project and a vite-react build, serves them with correct headers, and rolls back by alias", async () => {
    const st = await request("POST", "/deployments", { projectId: "proj-static", deploymentId: "dep-static-1", framework: "static", settings: staticTemplates[0].settings, files: staticTemplates[0].files, slug: "my-site" });
    expect(st.status).toBe(200);
    const s = st.json() as { url: string; fileCount: number; log: string };
    expect(s.url).toBe("http://my-site.sites.test:4100/");
    expect(s.fileCount).toBeGreaterThan(0);
    expect(s.log).toContain("Live at");
    const home = await proxyGet("my-site.sites.test");
    expect(home.status).toBe(200);
    expect(home.headers["content-type"]).toContain("text/html");
    expect(home.headers["content-security-policy"]).toContain("frame-ancestors");
    expect(home.headers["x-codexa-deployment"]).toBe("dep-static-1");
    expect((await proxyGet("my-site.sites.test", "/../../../etc/passwd")).status).not.toBe(200);

    const tpl = viteReactTemplates[0];
    const vt = await request("POST", "/deployments", { projectId: "proj-vite", deploymentId: "dep-vite-1", framework: "vite-react", settings: tpl.settings, files: tpl.files, slug: "my-site" });
    expect(vt.status).toBe(200);
    const v = vt.json() as { url: string; log: string };
    expect(v.log).toMatch(/built in/);
    const built = await proxyGet("my-site.sites.test");
    expect(built.headers["x-codexa-deployment"]).toBe("dep-vite-1");
    const asset = /\/assets\/[^"]+\.js/.exec(built.text)?.[0];
    expect(asset).toBeTruthy();
    const js = await proxyGet("my-site.sites.test", asset!);
    expect(js.status).toBe(200);
    expect(js.headers["content-type"]).toContain("text/javascript");
    expect(js.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    // SPA fallback for client-side routes, 404 for missing assets.
    expect((await proxyGet("my-site.sites.test", "/dashboard/settings", { accept: "text/html" })).status).toBe(200);
    expect((await proxyGet("my-site.sites.test", "/missing.png")).status).toBe(404);
    expect((await proxyGet("my-site.sites.test", "/", { accept: "text/html" })).headers["content-security-policy"]).toBeTruthy();

    // Rollback: point the slug back at the static deployment.
    const rb = await request("POST", "/deployments/alias", { slug: "my-site", deploymentId: "dep-static-1" });
    expect(rb.status).toBe(200);
    expect((await proxyGet("my-site.sites.test")).headers["x-codexa-deployment"]).toBe("dep-static-1");
    expect((await request("POST", "/deployments/alias", { slug: "my-site", deploymentId: "does-not-exist" })).status).toBe(404);
    expect((await request("POST", "/deployments/alias", { slug: "Bad Slug", deploymentId: "dep-static-1" })).status).toBe(400);

    const log = (await request("GET", "/deployments/dep-vite-1/log")).json() as { log: string };
    expect(log.log).toContain("Published");
    expect((await request("GET", "/deployments/nope/log")).status).toBe(404);
    expect((await proxyGet("unknown.sites.test")).status).toBe(404);
    expect((await proxyGet("totally.unrelated.example")).status).toBe(404);
  }, 300_000);

  it("fails a deployment cleanly when the build breaks or the framework cannot be hosted", async () => {
    const tpl = viteReactTemplates[0];
    const broken = { ...tpl.files, "src/App.tsx": "export default function App() { return <h1>{missing}</h1> }" };
    const r = await request("POST", "/deployments", { projectId: "proj-vite", deploymentId: "dep-broken-1", framework: "vite-react", settings: tpl.settings, files: broken, slug: "broken-site" });
    expect(r.status).toBe(422);
    const body = r.json() as { error: { code: string; message: string }; log?: string };
    expect(body.error.code).toBe("build_failed");
    expect(body.log).toMatch(/missing|error/i);
    expect((await proxyGet("broken-site.sites.test")).status).toBe(404);
    const srv = await request("POST", "/deployments", { projectId: "p", deploymentId: "dep-x", framework: "node-express", files: {}, slug: "x" });
    expect(srv.status).toBe(400);
  }, 300_000);
});

describe.skipIf(canRun)("runner service (skipped)", () => {
  it("needs Linux, root and prepared base sets", () => {
    expect(canRun).toBe(false);
  });
});
