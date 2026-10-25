import net from "node:net";

/**
 * Allocates TCP ports for sandboxed dev servers. Ports are reserved in
 * memory first (so two concurrent session starts never pick the same port)
 * and then probed with a real bind on the loopback address, because the
 * local driver shares the host network namespace.
 */
export class PortAllocator {
  private reserved = new Set<number>();
  private cursor: number;

  constructor(
    private readonly start: number,
    private readonly end: number,
    private readonly probe: (port: number) => Promise<boolean> = isPortFree,
  ) {
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1024 || end > 65535 || end < start) {
      throw new Error(`Invalid port range ${start}-${end}`);
    }
    this.cursor = start;
  }

  get size() {
    return this.end - this.start + 1;
  }

  get inUse() {
    return this.reserved.size;
  }

  /** Reserve and return a free port, or throw when the range is exhausted. */
  async allocate(): Promise<number> {
    for (let i = 0; i < this.size; i++) {
      const candidate = this.cursor;
      this.cursor = this.cursor >= this.end ? this.start : this.cursor + 1;
      if (this.reserved.has(candidate)) continue;
      this.reserved.add(candidate);
      if (await this.probe(candidate)) return candidate;
      this.reserved.delete(candidate);
    }
    throw new Error("No free ports available in the runner port range");
  }

  release(port: number) {
    this.reserved.delete(port);
  }
}

export function isPortFree(port: number, host = "0.0.0.0"): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.once("error", () => resolve(false));
    srv.listen({ port, host, exclusive: true }, () => {
      srv.close(() => resolve(true));
    });
  });
}

/** Wait until something accepts TCP connections on 127.0.0.1:port (dev server booted). */
export function waitForPort(port: number, timeoutMs: number, signal?: { aborted: boolean }): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const attempt = () => {
      if (signal?.aborted) return resolve(false);
      const sock = net.connect({ port, host: "127.0.0.1" });
      sock.once("connect", () => {
        sock.destroy();
        resolve(true);
      });
      sock.once("error", () => {
        sock.destroy();
        if (Date.now() > deadline) resolve(false);
        else setTimeout(attempt, 250);
      });
    };
    attempt();
  });
}
