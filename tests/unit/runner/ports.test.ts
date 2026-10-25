import { describe, expect, it } from "vitest";
import { PortAllocator, isPortFree, waitForPort } from "../../../services/runner/lib/ports";
import net from "node:net";

describe("PortAllocator", () => {
  it("hands out unique ports, skips busy ones and wraps around", async () => {
    const busy = new Set([20001]);
    const a = new PortAllocator(20000, 20003, async (p) => !busy.has(p));
    expect(await a.allocate()).toBe(20000);
    expect(await a.allocate()).toBe(20002); // 20001 busy
    expect(await a.allocate()).toBe(20003);
    expect(a.inUse).toBe(3);
    a.release(20000);
    expect(await a.allocate()).toBe(20000); // wrapped
    expect(a.size).toBe(4);
  });

  it("never returns the same port to two concurrent callers", async () => {
    const a = new PortAllocator(21000, 21010, async () => {
      await new Promise((r) => setTimeout(r, 5));
      return true;
    });
    const ports = await Promise.all(Array.from({ length: 8 }, () => a.allocate()));
    expect(new Set(ports).size).toBe(8);
  });

  it("throws when the range is exhausted and validates the range", async () => {
    const a = new PortAllocator(22000, 22001, async () => true);
    await a.allocate();
    await a.allocate();
    await expect(a.allocate()).rejects.toThrow(/No free ports/);
    expect(() => new PortAllocator(80, 90)).toThrow(/Invalid port range/);
    expect(() => new PortAllocator(3000, 2000)).toThrow(/Invalid port range/);
  });

  it("probes real sockets: a listening port is not free and waitForPort sees it", async () => {
    const srv = net.createServer();
    await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
    const port = (srv.address() as net.AddressInfo).port;
    expect(await isPortFree(port, "127.0.0.1")).toBe(false);
    expect(await waitForPort(port, 1000)).toBe(true);
    await new Promise<void>((r) => srv.close(() => r()));
    expect(await isPortFree(port, "127.0.0.1")).toBe(true);
    expect(await waitForPort(port, 300)).toBe(false);
    expect(await waitForPort(port, 5000, { aborted: true })).toBe(false);
  });
});
