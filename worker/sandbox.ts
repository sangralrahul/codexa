import { DurableObject } from "cloudflare:workers";
import { RUNNER_CONTROL_HEADER, type Env } from "./env";

const CONTROL_PORT = 4000;
const PREVIEW_PORT = 4100;
const STARTUP_TIMEOUT_MS = 90_000;
const IDLE_STOP_MS = 30 * 60_000;

/** A small page the editor can show inside its preview frame (Cloudflare's own error pages refuse to be framed). */
export function previewProblem(status: number, title: string, detail: string): Response {
  const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font-family:system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d12;color:#e6e8ee}main{max-width:32rem;padding:2rem;text-align:center}h1{font-size:1.15rem;margin:0 0 .5rem}p{color:#9aa3b2;line-height:1.55;margin:0 0 1.25rem}button{font:inherit;padding:.55rem 1rem;border-radius:8px;border:1px solid #2a2f3a;background:#151922;color:#e6e8ee;cursor:pointer}</style></head><body><main><h1>${esc(title)}</h1><p>${esc(detail)}</p><button onclick="location.reload()">Reload</button></main></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/**
 * One Durable Object per project. It owns that project's Cloudflare Container
 * (image: containers/runner), starts it on demand, and forwards:
 *   - control calls from the app (header x-codexa-runner: control) to the
 *     runner API on port 4000, adding the container's private token;
 *   - preview traffic (<token>.<PREVIEW_HOST>, including WebSockets for hot
 *     reload) to the runner's preview proxy on port 4100.
 * The container stops itself after 30 minutes without requests.
 */
export class ProjectSandbox extends DurableObject<Env> {
  private starting: Promise<void> | null = null;

  private async token(): Promise<string> {
    let t = await this.ctx.storage.get<string>("runnerToken");
    if (!t) {
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      t = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
      await this.ctx.storage.put("runnerToken", t);
    }
    return t;
  }

  private async ensureRunning(): Promise<void> {
    const container = this.ctx.container;
    if (!container) throw new Error("Containers are not enabled for this Worker (see the containers section of wrangler.jsonc)");
    if (container.running) return;
    if (!this.starting) {
      this.starting = (async () => {
        const token = await this.token();
        const image = container.images.runner;
        container.start({
          ...(image ? { image } : {}),
          enableInternet: true, // npm install for custom dependencies
          instance: "standard-1", // 1/2 vCPU, 4 GiB memory, 8 GB disk
          env: {
            RUNNER_TOKEN: token,
            PREVIEW_HOST: this.env.PREVIEW_HOST ?? "preview.localhost",
            DEPLOY_HOST: this.env.DEPLOY_HOST ?? "sites.localhost",
            PREVIEW_PROTOCOL: this.env.PREVIEW_PROTOCOL ?? "https",
          },
        } as Parameters<typeof container.start>[0]);
        this.ctx.waitUntil(container.monitor().catch(() => undefined));
        await container.setInactivityTimeout(IDLE_STOP_MS);
        const deadline = Date.now() + STARTUP_TIMEOUT_MS;
        let lastError = "";
        while (Date.now() < deadline) {
          try {
            const res = await container.getTcpPort(CONTROL_PORT).fetch("http://container/health", { headers: { authorization: `Bearer ${token}` } });
            if (res.ok) return;
            lastError = `health ${res.status}`;
          } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
          }
          await new Promise((r) => setTimeout(r, 500));
        }
        throw new Error(`The project container did not become ready in time (${lastError})`);
      })().finally(() => {
        this.starting = null;
      });
    }
    await this.starting;
  }

  /** Requests that may start a stopped container; anything else answers from the stopped state. */
  private canStart(method: string, path: string) {
    return (method === "POST" && (path === "/sessions" || path === "/deployments")) || path === "/health";
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const container = this.ctx.container;
    if (request.headers.get(RUNNER_CONTROL_HEADER) === "control") {
      const path = url.pathname + url.search;
      if (!container?.running && !this.canStart(request.method, url.pathname)) {
        // Sessions and build outputs live inside the container; once it has stopped they are gone.
        return json(404, { error: { code: "not_found", message: "The project's container is not running" } });
      }
      try {
        await this.ensureRunning();
      } catch (err) {
        return json(503, { error: { code: "container_unavailable", message: err instanceof Error ? err.message : String(err) } });
      }
      const headers = new Headers(request.headers);
      headers.delete(RUNNER_CONTROL_HEADER);
      headers.set("authorization", `Bearer ${await this.token()}`);
      return this.ctx.container!.getTcpPort(CONTROL_PORT).fetch(`http://container${path}`, {
        method: request.method,
        headers,
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      });
    }
    // Preview traffic: only while the container runs (the app starts it).
    if (!container?.running) {
      return previewProblem(404, "This preview is not running", "Start it again with Run in the Codexa workspace.");
    }
    // The preview proxy can be briefly unreachable (container just started or restarting): retry
    // for a few seconds. A WebSocket upgrade or a request with a body is tried once.
    const retryable = !request.body && request.headers.get("upgrade")?.toLowerCase() !== "websocket";
    // Containers only accept plain HTTP: keep the preview's host (the runner routes on it) and
    // pass the visitor's scheme along in x-forwarded-proto.
    const target = new URL(request.url);
    const proto = target.protocol.replace(":", "");
    target.protocol = "http:";
    const forward = (req: Request) => {
      const out = new Request(target.toString(), req);
      out.headers.set("x-forwarded-proto", proto);
      return out;
    };
    let lastError = "";
    for (let attempt = 0; attempt < (retryable ? 6 : 1); attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 800));
      try {
        return await container.getTcpPort(PREVIEW_PORT).fetch(forward(retryable ? request.clone() : request));
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }
    console.error(`[preview] project container did not answer on port ${PREVIEW_PORT}: ${lastError}`);
    return previewProblem(502, "The preview server isn't answering yet", `The project's container is running but its preview did not respond (${lastError}). Wait a few seconds and reload, or press Stop and Run again.`);
  }
}
