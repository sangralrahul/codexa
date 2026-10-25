/**
 * Wires config, driver, managers, control API and preview proxy together.
 * Exported as a function so integration tests can start the runner in-process
 * on ephemeral ports and shut it down cleanly.
 */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig, type RunnerConfig } from "./config";
import { ensureLayout } from "./lib/layout";
import { STATIC_SERVER_SCRIPT } from "./lib/static-server";
import { createDriver } from "./sandbox";
import { SessionManager, view } from "./sessions";
import { DeploymentManager } from "./deployments";
import { createProxyServer } from "./proxy";
import { Router, HttpError, sse } from "./http";
import { cgroupsAvailable } from "./lib/cgroup";

export type RunnerApp = {
  cfg: RunnerConfig;
  sessions: SessionManager;
  deployments: DeploymentManager;
  apiServer: http.Server;
  proxyServer: http.Server;
  apiPort: number;
  proxyPort: number;
  close(): Promise<void>;
};

const STARTED_AT = Date.now();

export async function createRunner(overrides: Partial<RunnerConfig> = {}): Promise<RunnerApp> {
  const cfg: RunnerConfig = { ...loadConfig(), ...overrides, limits: { ...loadConfig().limits, ...(overrides.limits ?? {}) } };
  await ensureLayout(cfg);
  await fs.writeFile(path.join(cfg.binDir, "static-server.cjs"), STATIC_SERVER_SCRIPT, { mode: 0o644 });
  const driver = createDriver(cfg);
  await driver.init();
  const sessions = new SessionManager(cfg, driver);
  const deployments = new DeploymentManager(cfg, driver);
  const baseManifest = await fs.readFile(path.join(cfg.baseDir, "manifest.json"), "utf8").then((s) => JSON.parse(s) as Record<string, { installedAt: string }>).catch(() => ({}));

  const router = new Router(cfg.token, 96 * 1024 * 1024);

  router.add("GET", "/health", async () => ({
    ok: true,
    version: 1,
    uptimeMs: Date.now() - STARTED_AT,
    driver: driver.describe(),
    cgroups: cgroupsAvailable(),
    baseSets: Object.fromEntries(Object.entries(baseManifest).map(([k, v]) => [k, v.installedAt])),
    sessions: sessions.stats(),
    previewHost: cfg.previewHost,
    deployHost: cfg.deployHost,
  }));

  router.add("GET", "/sessions", async () => ({ sessions: sessions.list() }));

  router.add("POST", "/sessions", async ({ body }) => {
    const b = (await body()) as Record<string, unknown>;
    const s = await sessions.create({
      projectId: String(b.projectId ?? ""),
      framework: String(b.framework ?? ""),
      settings: (b.settings as Record<string, unknown>) ?? {},
      files: b.files,
      env: (b.env as Record<string, string>) ?? {},
      previewToken: String(b.previewToken ?? ""),
    });
    return { id: s.id, port: s.port, previewUrl: s.previewUrl, status: s.status, session: view(s) };
  });

  router.add("GET", "/sessions/:id", async ({ params, url }) => {
    const s = sessions.get(params.id);
    if (!s) throw new HttpError(404, "Session not found", "not_found");
    if (url.searchParams.get("heartbeat") === "1") sessions.touch(s);
    return { session: view(s) };
  });

  router.add("PUT", "/sessions/:id/files", async ({ params, body }) => {
    const b = (await body()) as { files?: unknown; deletes?: unknown };
    return await sessions.sync(params.id, b);
  });

  router.add("POST", "/sessions/:id/exec", async ({ params, body }) => {
    const b = (await body()) as { command?: unknown; timeoutMs?: unknown };
    return await sessions.exec(params.id, b.command, { timeoutMs: typeof b.timeoutMs === "number" ? b.timeoutMs : undefined });
  });

  router.add("GET", "/sessions/:id/logs", async ({ params, url, req, res }) => {
    const s = sessions.get(params.id);
    if (!s) throw new HttpError(404, "Session not found", "not_found");
    const tail = url.searchParams.get("tail");
    if (tail !== null) {
      const n = Math.max(0, Math.min(Number(tail) || 200, cfg.limits.logLines));
      return { lines: s.logs.tail(n), status: s.status };
    }
    const stream = sse(req, res);
    for (const line of s.logs.tail()) stream.send("log", line);
    stream.send("status", { status: s.status, previewUrl: s.previewUrl });
    const unsub = s.logs.subscribe((line) => stream.send("log", line));
    const statusTimer = setInterval(() => stream.send("status", { status: s.status, previewUrl: s.previewUrl }), 5000);
    await stream.closed;
    unsub();
    clearInterval(statusTimer);
  });

  router.add("DELETE", "/sessions/:id", async ({ params }) => {
    const ok = await sessions.stop(params.id);
    if (!ok) throw new HttpError(404, "Session not found", "not_found");
    return { stopped: true };
  });

  router.add("POST", "/deployments", async ({ body }) => {
    const b = (await body()) as Record<string, unknown>;
    try {
      return await deployments.deploy({
        projectId: String(b.projectId ?? ""),
        deploymentId: String(b.deploymentId ?? ""),
        framework: String(b.framework ?? ""),
        settings: (b.settings as Record<string, unknown>) ?? {},
        files: b.files,
        slug: String(b.slug ?? ""),
      });
    } catch (err) {
      if (err instanceof HttpError && (err as HttpError & { log?: string }).log !== undefined) {
        const e = err as HttpError & { log?: string };
        throw Object.assign(new HttpError(e.status, e.message, e.code), { log: e.log });
      }
      throw err;
    }
  });

  router.add("POST", "/deployments/alias", async ({ body }) => {
    const b = (await body()) as { slug?: unknown; deploymentId?: unknown };
    return await deployments.setAlias(String(b.slug ?? ""), String(b.deploymentId ?? ""));
  });

  router.add("GET", "/deployments/:id/log", async ({ params }) => {
    const log = await deployments.readLog(params.id);
    if (log === null) throw new HttpError(404, "Deployment log not found", "not_found");
    return { log };
  });

  const apiServer = http.createServer(async (req, res) => {
    try {
      await router.listener(req, res);
    } catch (err) {
      // Build failures carry the log so the Next side can persist it.
      const e = err as HttpError & { log?: string };
      if (!res.headersSent) {
        res.writeHead(e.status ?? 500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { code: e.code ?? "internal", message: e.message }, log: e.log }));
      }
    }
  });
  const proxyServer = createProxyServer(cfg, sessions, deployments, { appUrl: process.env.APP_URL });

  const apiBind = process.env.RUNNER_BIND || "127.0.0.1";
  const proxyBind = process.env.RUNNER_PREVIEW_BIND || "127.0.0.1";
  await listen(apiServer, cfg.port, apiBind);
  await listen(proxyServer, cfg.previewPort, proxyBind);
  sessions.startSweeper();

  const apiPort = (apiServer.address() as { port: number }).port;
  const proxyPort = (proxyServer.address() as { port: number }).port;

  return {
    cfg,
    sessions,
    deployments,
    apiServer,
    proxyServer,
    apiPort,
    proxyPort,
    close: async () => {
      sessions.stopSweeper();
      await sessions.stopAll();
      await Promise.all([closeServer(apiServer), closeServer(proxyServer)]);
    },
  };
}

function listen(server: http.Server, port: number, host: string) {
  return new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function closeServer(server: http.Server) {
  return new Promise<void>((resolve) => {
    server.closeAllConnections?.();
    server.close(() => resolve());
  });
}
