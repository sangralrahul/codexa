import type { Env } from "./env";

/**
 * Codexa hosting: serves the live deployment for <slug>.<DEPLOY_HOST> from
 * R2 (sites/<deploymentId>/<path>). The live deployment is whichever Codexa
 * deployment for that slug is marked "live" in D1, so rollback is a status
 * change and needs no file copying.
 */
const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  map: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  wasm: "application/wasm",
  webmanifest: "application/manifest+json",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  pdf: "application/pdf",
};

const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "content-security-policy": "frame-ancestors 'self'",
};

type Live = { id: string; projectId: string } | null;
const cache = new Map<string, { live: Live; at: number }>();

/** The live Codexa deployment for a site name, or for a verified custom domain. Cached 15s per isolate. */
async function liveDeployment(env: Env, key: { slug: string } | { domain: string }): Promise<Live> {
  const k = "slug" in key ? `s:${key.slug}` : `d:${key.domain}`;
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < 15_000) return hit.live;
  const row =
    "slug" in key
      ? await env.DB.prepare(
          "SELECT id, project_id FROM deployments WHERE provider = 'codexa' AND status = 'live' AND json_extract(config, '$.slug') = ?1 ORDER BY created_at DESC LIMIT 1",
        )
          .bind(key.slug)
          .first<{ id: string; project_id: string }>()
      : await env.DB.prepare(
          "SELECT d.id, d.project_id FROM custom_domains c JOIN deployments d ON d.project_id = c.project_id WHERE c.domain = ?1 AND c.verified_at IS NOT NULL AND d.provider = 'codexa' AND d.status = 'live' ORDER BY d.created_at DESC LIMIT 1",
        )
          .bind(key.domain)
          .first<{ id: string; project_id: string }>();
  const live = row ? { id: row.id, projectId: row.project_id } : null;
  cache.set(k, { live, at: Date.now() });
  return live;
}

/** True when a verified custom domain points at a project (used before falling through to the app). */
export async function isCustomDomain(env: Env, domain: string): Promise<boolean> {
  return (await liveDeployment(env, { domain })) !== null;
}

/** One page view for the project today (UTC). Page loads only: HTML documents, not assets. */
function countView(env: Env, ctx: ExecutionContext | undefined, projectId: string) {
  if (!ctx) return;
  const day = new Date().toISOString().slice(0, 10);
  ctx.waitUntil(
    env.DB.prepare("INSERT INTO site_visits (project_id, day, views) VALUES (?1, ?2, 1) ON CONFLICT (project_id, day) DO UPDATE SET views = views + 1")
      .bind(projectId, day)
      .run()
      .catch(() => undefined),
  );
}

function notFound(message: string) {
  return new Response(`<!doctype html><title>Not found</title><body style="font-family:system-ui;padding:3rem"><h1>Not found</h1><p>${message}</p></body>`, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", ...SECURITY_HEADERS },
  });
}

export async function serveSite(request: Request, env: Env, key: { slug: string } | { domain: string }, ctx?: ExecutionContext): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  const live = await liveDeployment(env, key);
  if (!live) return notFound("No site is published at this address.");
  const id = live.id;
  const url = new URL(request.url);
  let path = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (path.split("/").some((s) => s === ".." || s === ".")) return notFound("Invalid path.");
  if (!path || path.endsWith("/")) path += "index.html";
  let object = await env.STORAGE.get(`sites/${id}/${path}`);
  let servedPath = path;
  if (!object && !/\.[a-z0-9]+$/i.test(path)) {
    // Single-page apps: unknown routes fall back to index.html.
    object = await env.STORAGE.get(`sites/${id}/index.html`);
    servedPath = "index.html";
  }
  if (!object) return notFound("This page does not exist.");
  const ext = servedPath.split(".").pop()?.toLowerCase() ?? "";
  const immutable = /^assets\//.test(servedPath) && /[.-][A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(servedPath);
  const headers = new Headers({
    "content-type": TYPES[ext] ?? "application/octet-stream",
    // Hashed build assets never change; everything else revalidates (cheap 304 via ETag) so a
    // redeploy or rollback shows up immediately.
    "cache-control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate",
    etag: object.httpEtag,
    ...SECURITY_HEADERS,
  });
  if (request.method === "GET" && ext === "html" && request.headers.get("sec-fetch-dest") !== "iframe" && !/bot|crawler|spider|preview/i.test(request.headers.get("user-agent") ?? "")) countView(env, ctx, live.projectId);
  if (request.headers.get("if-none-match") === object.httpEtag) return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : (object.body as unknown as ReadableStream), { status: 200, headers });
}
