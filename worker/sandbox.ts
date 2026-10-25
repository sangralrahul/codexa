import { DurableObject } from "cloudflare:workers";
import { RUNNER_CONTROL_HEADER, type Env } from "./env";

const CONTROL_PORT = 4000;
const PREVIEW_PORT = 4100;
const STARTUP_TIMEOUT_MS = 90_000;
const IDLE_STOP_MS = 30 * 60_000;

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
      return new Response("This preview is not running. Start it again from the Codexa workspace.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    return container.getTcpPort(PREVIEW_PORT).fetch(request);
  }
}
