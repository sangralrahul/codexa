/**
 * Tiny static file server shipped into every sandbox (written to
 * <data>/bin/static-server.cjs by index.ts). It is executed *inside* the
 * sandbox for `static` projects, so it has the same privileges as any other
 * user code: none. Plain CommonJS so it runs with the sandbox's node binary
 * without a package.json.
 */
export const STATIC_SERVER_SCRIPT = `"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const root = path.resolve(process.env.STATIC_ROOT || process.cwd());
const port = Number(process.env.PORT || 5173);
const types = { ".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".woff": "font/woff", ".woff2": "font/woff2", ".map": "application/json", ".webmanifest": "application/manifest+json", ".xml": "application/xml" };
function send(res, status, body, type) {
  res.writeHead(status, { "content-type": type || "text/plain; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(body);
}
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { return send(res, 400, "Bad request"); }
  if (pathname.includes("\\0")) return send(res, 400, "Bad request");
  let file = path.resolve(root, "." + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) return send(res, 403, "Forbidden");
  const rel = path.relative(root, file);
  if (rel.split(path.sep).includes("node_modules")) return send(res, 404, "Not found");
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) {
      if (!pathname.endsWith("/")) { res.writeHead(302, { location: pathname + "/" }); return res.end(); }
      file = path.join(file, "index.html");
    }
    fs.readFile(file, (err2, data) => {
      if (err2) return send(res, 404, "<!doctype html><title>404</title><h1>404 Not found</h1><p>" + pathname.replace(/[<>&]/g, "") + "</p>", "text/html; charset=utf-8");
      send(res, 200, data, types[path.extname(file).toLowerCase()] || "application/octet-stream");
    });
  });
});
server.listen(port, "0.0.0.0", () => console.log("[codexa-static] serving " + root + " on http://0.0.0.0:" + port));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
`;
