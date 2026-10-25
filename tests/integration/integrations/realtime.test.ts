/**
 * Spawns the realtime server on a random port and verifies auth, presence fan-out,
 * message relay, the per-client rate limit and the payload cap with real WebSocket clients.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { createRealtimeServer, MAX_MESSAGE_BYTES, type RealtimeServer } from "../../../services/realtime/server";
import { issueRealtimeToken } from "@/lib/integrations/realtime-token";

const SECRET = "realtime-integration-test-secret-123456";
let server: RealtimeServer;

type Msg = Record<string, unknown> & { type: string };

function connect(token: string) {
  const ws = new WebSocket(`ws://127.0.0.1:${server.port}/?token=${encodeURIComponent(token)}`);
  const inbox: Msg[] = [];
  const waiters: { pred: (m: Msg) => boolean; resolve: (m: Msg) => void }[] = [];
  ws.on("message", (data) => {
    const m = JSON.parse(data.toString()) as Msg;
    inbox.push(m);
    for (const w of [...waiters]) {
      if (w.pred(m)) {
        waiters.splice(waiters.indexOf(w), 1);
        w.resolve(m);
      }
    }
  });
  const next = (pred: (m: Msg) => boolean, timeout = 3000) =>
    new Promise<Msg>((resolve, reject) => {
      const found = inbox.find(pred);
      if (found) return resolve(found);
      const t = setTimeout(() => reject(new Error("timed out waiting for message")), timeout);
      waiters.push({
        pred,
        resolve: (m) => {
          clearTimeout(t);
          resolve(m);
        },
      });
    });
  const open = new Promise<void>((resolve, reject) => {
    ws.once("open", () => resolve());
    ws.once("error", reject);
  });
  const closed = new Promise<{ code: number }>((resolve) => ws.once("close", (code) => resolve({ code })));
  return { ws, inbox, next, open, closed, send: (m: unknown) => ws.send(JSON.stringify(m)) };
}

const token = (userId: string, projectId = "proj-1", name = userId) => issueRealtimeToken({ projectId, userId, name, color: "#123456" }, SECRET);

beforeAll(async () => {
  server = await createRealtimeServer({ port: 0, host: "127.0.0.1", secret: SECRET, heartbeatMs: 60_000 });
});

afterAll(async () => {
  await server.close();
});

describe("realtime presence server", () => {
  it("serves a health endpoint", async () => {
    const r = await fetch(`http://127.0.0.1:${server.port}/health`);
    expect(await r.json()).toMatchObject({ ok: true });
  });

  it("rejects missing, invalid and expired tokens", async () => {
    for (const t of ["", "garbage", issueRealtimeToken({ projectId: "p", userId: "u", name: "u", color: "#000", exp: Date.now() - 1 }, SECRET), token("x").replace(/.$/, "0")]) {
      const c = connect(t);
      await expect(c.open).rejects.toBeTruthy();
    }
    expect(server.stats().clients).toBe(0);
  });

  it("two clients in the same project see each other; other projects are isolated", async () => {
    const a = connect(token("alice", "proj-1", "Alice"));
    await a.open;
    const welcomeA = await a.next((m) => m.type === "welcome");
    expect(welcomeA.peers).toEqual([]);
    expect((welcomeA.self as { name: string }).name).toBe("Alice");

    const b = connect(token("bob", "proj-1", "Bob"));
    await b.open;
    const welcomeB = await b.next((m) => m.type === "welcome");
    expect((welcomeB.peers as { name: string }[]).map((p) => p.name)).toEqual(["Alice"]);
    const join = await a.next((m) => m.type === "join");
    expect((join.peer as { name: string }).name).toBe("Bob");

    const other = connect(token("carol", "proj-2", "Carol"));
    await other.open;
    const welcomeC = await other.next((m) => m.type === "welcome");
    expect(welcomeC.peers).toEqual([]);
    expect(server.stats()).toEqual({ rooms: 2, clients: 3 });

    // presence update + file-changed + cursor relay (sender excluded)
    b.send({ type: "presence", activeFile: "src/App.tsx" });
    const presence = await a.next((m) => m.type === "presence");
    expect((presence.peer as { activeFile: string }).activeFile).toBe("src/App.tsx");
    b.send({ type: "file-changed", paths: ["src/App.tsx"] });
    const changed = await a.next((m) => m.type === "file-changed");
    expect(changed.paths).toEqual(["src/App.tsx"]);
    expect((changed.from as { name: string }).name).toBe("Bob");
    b.send({ type: "cursor", path: "src/App.tsx", line: 3, column: 7 });
    const cursor = await a.next((m) => m.type === "cursor");
    expect(cursor).toMatchObject({ path: "src/App.tsx", line: 3, column: 7 });
    expect(b.inbox.filter((m) => m.type === "file-changed")).toHaveLength(0);
    expect(other.inbox.filter((m) => m.type !== "welcome")).toHaveLength(0);

    // ping/pong and bad messages
    a.send({ type: "ping", t: 42 });
    expect((await a.next((m) => m.type === "pong")).t).toBe(42);
    a.send("not json");
    expect((await a.next((m) => m.type === "error")).code).toBe("bad_message");

    // leave
    b.ws.close();
    const leave = await a.next((m) => m.type === "leave");
    expect(leave.userId).toBe("bob");
    a.ws.close();
    other.ws.close();
    await Promise.all([a.closed, b.closed, other.closed]);
    await new Promise((r) => setTimeout(r, 50));
    expect(server.stats()).toEqual({ rooms: 0, clients: 0 });
  });

  it("enforces the 20 msg/s rate limit and the 16 KB payload cap", async () => {
    const a = connect(token("spammer", "proj-rl"));
    await a.open;
    await a.next((m) => m.type === "welcome");
    for (let i = 0; i < 40; i++) a.send({ type: "ping" });
    const err = await a.next((m) => m.type === "error" && m.code === "rate_limited");
    expect(err.message).toMatch(/20 messages/);
    expect(a.inbox.filter((m) => m.type === "pong").length).toBeLessThanOrEqual(20);
    a.ws.close();
    await a.closed;

    const big = connect(token("big", "proj-rl"));
    await big.open;
    big.send({ type: "file-changed", paths: ["x".repeat(MAX_MESSAGE_BYTES + 10)] });
    const { code } = await big.closed;
    expect(code).toBe(1009); // message too big
  });
});
