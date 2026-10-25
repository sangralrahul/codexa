/**
 * Minimal HTTP router for the runner control API. Deliberately dependency
 * free: bearer auth, JSON bodies with a size cap, path params and SSE.
 */
import http from "node:http";
import { URL } from "node:url";
import { timingSafeEqual } from "node:crypto";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "error",
  ) {
    super(message);
  }
}

export type Ctx = { req: http.IncomingMessage; res: http.ServerResponse; params: Record<string, string>; url: URL; body: () => Promise<unknown> };
export type Handler = (ctx: Ctx) => Promise<unknown | void>;
type Route = { method: string; pattern: RegExp; keys: string[]; handler: Handler };

export class Router {
  private routes: Route[] = [];
  constructor(
    private readonly token: string,
    private readonly maxBodyBytes: number,
  ) {}

  add(method: string, path: string, handler: Handler) {
    const keys: string[] = [];
    const pattern = new RegExp(
      "^" +
        path.replace(/:(\w+)/g, (_m, k: string) => {
          keys.push(k);
          return "([^/]+)";
        }) +
        "/?$",
    );
    this.routes.push({ method, pattern, keys, handler });
  }

  private authorized(req: http.IncomingMessage): boolean {
    const h = req.headers.authorization || "";
    const m = /^Bearer\s+(.+)$/i.exec(h);
    if (!m) return false;
    const a = Buffer.from(m[1]);
    const b = Buffer.from(this.token);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  listener = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const url = new URL(req.url || "/", "http://runner");
    try {
      if (url.pathname !== "/health" && !this.authorized(req)) throw new HttpError(401, "Missing or invalid bearer token", "unauthorized");
      for (const r of this.routes) {
        if (r.method !== req.method) continue;
        const m = r.pattern.exec(url.pathname);
        if (!m) continue;
        const params: Record<string, string> = {};
        r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
        const body = () => readJson(req, this.maxBodyBytes);
        const out = await r.handler({ req, res, params, url, body });
        if (!res.headersSent && !res.writableEnded) {
          if (out === undefined) {
            res.writeHead(204);
            res.end();
          } else sendJson(res, 200, out);
        }
        return;
      }
      throw new HttpError(404, `No route for ${req.method} ${url.pathname}`, "not_found");
    } catch (err) {
      if (res.headersSent) {
        res.end();
        return;
      }
      const status = err instanceof HttpError ? err.status : (err as { status?: number })?.status ?? 500;
      const code = err instanceof HttpError ? err.code : status === 400 ? "bad_request" : "internal";
      const message = err instanceof Error ? err.message : String(err);
      if (status >= 500) console.error("[runner] unhandled error", err);
      // Build failures carry their log so the Next side can persist it with the deployment.
      const log = (err as { log?: unknown } | null)?.log;
      sendJson(res, status, { error: { code, message }, ...(typeof log === "string" ? { log } : {}) });
    }
  };
}

export function sendJson(res: http.ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(body), "cache-control": "no-store" });
  res.end(body);
}

export function readJson(req: http.IncomingMessage, maxBytes: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > maxBytes) {
        reject(new HttpError(413, `Request body exceeds ${maxBytes} bytes`, "payload_too_large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new HttpError(400, "Invalid JSON body", "bad_request"));
      }
    });
    req.on("error", reject);
  });
}

/** Server-sent events helper. Returns a writer and a close promise. */
export function sse(req: http.IncomingMessage, res: http.ServerResponse) {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
  res.write(": ok\n\n");
  const ping = setInterval(() => {
    if (!res.writableEnded) res.write(": ping\n\n");
  }, 15_000);
  const closed = new Promise<void>((resolve) => {
    const done = () => {
      clearInterval(ping);
      resolve();
    };
    req.on("close", done);
    res.on("close", done);
  });
  return {
    send(event: string, data: unknown) {
      if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    end() {
      clearInterval(ping);
      if (!res.writableEnded) res.end();
    },
    closed,
  };
}
