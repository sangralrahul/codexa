/**
 * Preview + sites proxy (RUNNER_PREVIEW_PORT).
 *   <previewToken>.<PREVIEW_HOST> → http://127.0.0.1:<session port>  (HTTP + WebSocket)
 *   <slug>.<DEPLOY_HOST>          → static files from sites/<deploymentId> (SPA fallback)
 * Unknown hosts get a plain 404 page. Browsers resolve *.localhost to
 * 127.0.0.1, so http://<token>.preview.localhost:4100 works without DNS.
 */
import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { Duplex } from "node:stream";
import httpProxy from "http-proxy";
import type { RunnerConfig } from "./config";
import { routeHost } from "./lib/hosts";
import type { SessionManager, Session } from "./sessions";
import type { DeploymentManager } from "./deployments";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webmanifest": "application/manifest+json",
  ".wasm": "application/wasm",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".pdf": "application/pdf",
};

export function contentTypeFor(file: string): string {
  return MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}

/** Vite/webpack emit content-hashed assets like assets/index-BxT4Q2p9.js → safe to cache forever. */
export function isImmutableAsset(urlPath: string): boolean {
  return /^\/assets\/[^/]+[-.][A-Za-z0-9_]{8,}\.[a-z0-9]+$/.test(urlPath) || /\.[A-Fa-f0-9]{8,}\.(js|css|woff2?|png|jpe?g|svg|webp|avif)$/.test(urlPath);
}

function page(title: string, body: string, status = 404, extraHead = ""): { status: number; html: string } {
  return {
    status,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>${extraHead}<style>body{font-family:system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d12;color:#e6e8ee}main{max-width:36rem;padding:2rem;text-align:center}h1{font-size:1.5rem;margin:0 0 .5rem}p{color:#9aa3b2;margin:.25rem 0}code{background:#161a23;padding:.1rem .4rem;border-radius:4px}</style></head><body><main><h1>${title}</h1>${body}</main></body></html>`,
  };
}

export function createProxyServer(cfg: RunnerConfig, sessions: SessionManager, deployments: DeploymentManager, opts: { appUrl?: string } = {}) {
  const proxy = httpProxy.createProxyServer({ ws: true, xfwd: true, changeOrigin: false, proxyTimeout: 60_000 });
  proxy.on("error", (err, _req, res) => {
    if (res && "writeHead" in res && typeof res.writeHead === "function" && !res.headersSent) {
      const p = page("Preview unavailable", `<p>The dev server did not answer: <code>${escapeHtml(err.message)}</code>.</p><p>Check the Logs panel and restart the preview.</p>`, 502);
      res.writeHead(p.status, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(p.html);
    } else if (res && "destroy" in res) {
      (res as Duplex).destroy();
    }
  });

  const frameAncestors = `frame-ancestors 'self' ${opts.appUrl ?? "http://localhost:3000"}`;
  const securityHeaders = (res: http.ServerResponse, kind: "preview" | "site") => {
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("referrer-policy", "strict-origin-when-cross-origin");
    if (kind === "site") {
      res.setHeader("content-security-policy", frameAncestors);
      res.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");
    }
    if (cfg.previewProtocol === "https") res.setHeader("strict-transport-security", "max-age=31536000");
  };

  const sendPage = (res: http.ServerResponse, p: { status: number; html: string }) => {
    res.writeHead(p.status, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
    res.end(p.html);
  };

  const previewFor = (host: string | undefined): { session: Session | null; route: ReturnType<typeof routeHost> } => {
    const route = routeHost(host, cfg.previewHost, cfg.deployHost);
    if (route.kind !== "preview") return { session: null, route };
    return { session: sessions.getByToken(route.token) ?? null, route };
  };

  const server = http.createServer(async (req, res) => {
    const { session, route } = previewFor(req.headers.host);
    if (route.kind === "preview") {
      if (!session) return sendPage(res, page("Preview not found", `<p>There is no running preview for this address. Start the project again from the Codexa workspace.</p>`));
      sessions.touch(session);
      if (session.status === "starting") {
        return sendPage(res, page("Starting preview…", `<p>The dev server is booting. This page refreshes automatically.</p>`, 503, `<meta http-equiv="refresh" content="2">`));
      }
      if (session.status !== "running") {
        return sendPage(res, page("Preview stopped", `<p>${escapeHtml(session.error ?? "The dev server is not running.")}</p><p>Restart it from the Preview panel.</p>`, 503));
      }
      securityHeaders(res, "preview");
      proxy.web(req, res, { target: `http://127.0.0.1:${session.port}` });
      return;
    }
    if (route.kind === "site") {
      securityHeaders(res, "site");
      await serveSite(route.slug, req, res, deployments, sendPage);
      return;
    }
    sendPage(res, page("Not found", `<p>No preview or site is served at <code>${escapeHtml(route.host || "this host")}</code>.</p><p>Previews live at <code>&lt;token&gt;.${cfg.previewHost}</code>, published sites at <code>&lt;slug&gt;.${cfg.deployHost}</code>.</p>`));
  });

  server.on("upgrade", (req, socket, head) => {
    const { session } = previewFor(req.headers.host);
    if (!session || session.status !== "running") {
      socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    sessions.touch(session);
    proxy.ws(req, socket, head, { target: `http://127.0.0.1:${session.port}` });
  });

  return server;
}

async function serveSite(slug: string, req: http.IncomingMessage, res: http.ServerResponse, deployments: DeploymentManager, sendPage: (res: http.ServerResponse, p: { status: number; html: string }) => void) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { allow: "GET, HEAD" });
    return res.end();
  }
  const target = await deployments.resolveSlug(slug);
  if (!target) return sendPage(res, page("Site not found", `<p>Nothing has been published at <code>${escapeHtml(slug)}</code> yet.</p>`));
  const root = deployments.siteDir(target);
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(req.url || "/", "http://x").pathname);
  } catch {
    return sendPage(res, page("Bad request", "", 400));
  }
  if (pathname.includes("\0")) return sendPage(res, page("Bad request", "", 400));
  let file = path.resolve(root, "." + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) return sendPage(res, page("Forbidden", "", 403));
  let st = await fsp.stat(file).catch(() => null);
  if (st?.isDirectory()) {
    file = path.join(file, "index.html");
    st = await fsp.stat(file).catch(() => null);
  }
  if (!st?.isFile()) {
    // SPA fallback: client-side routers expect index.html for unknown paths without an extension.
    const wantsHtml = !path.extname(pathname) && (req.headers.accept ?? "").includes("text/html");
    if (wantsHtml) {
      file = path.join(root, "index.html");
      st = await fsp.stat(file).catch(() => null);
    }
    if (!st?.isFile()) return sendPage(res, page("Not found", `<p><code>${escapeHtml(pathname)}</code> does not exist on this site.</p>`));
  }
  const immutable = isImmutableAsset(pathname);
  res.writeHead(200, {
    "content-type": contentTypeFor(file),
    "content-length": st.size,
    "cache-control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate",
    "last-modified": st.mtime.toUTCString(),
    "x-codexa-deployment": target,
  });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(file).pipe(res);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
