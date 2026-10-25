/**
 * Codexa realtime presence server (WebSocket). Factory so tests can spawn it on a random port.
 *
 * Protocol (JSON text frames, max 16 KB, max 20 messages/second per client):
 *   client → server  { type: "presence", activeFile?: string|null, cursor?: { path, line, column }|null }
 *                    { type: "file-changed", paths: string[] }
 *                    { type: "cursor", path, line, column }
 *                    { type: "ping" }
 *   server → client  { type: "welcome", self: Peer, peers: Peer[] }
 *                    { type: "join", peer: Peer } | { type: "leave", id } | { type: "presence", peer: Peer }
 *                    { type: "file-changed", from: PeerRef, paths: string[] }
 *                    { type: "cursor", from: PeerRef, path, line, column }
 *                    { type: "pong", t } | { type: "error", code, message }
 * Authentication: ?token=<base64url(payload)>.<hmac> issued by GET /api/v1/projects/:id/realtime-token.
 */
import { createServer, type IncomingMessage, type Server } from "node:http";
import { randomBytes } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import { verifyRealtimeToken, type RealtimeTokenPayload } from "../../src/lib/integrations/realtime-token";

export const MAX_MESSAGE_BYTES = 16 * 1024;
export const MAX_MESSAGES_PER_SECOND = 20;
export const HEARTBEAT_MS = 30_000;

export type Cursor = { path: string; line: number; column: number };
export type Peer = { id: string; userId: string; name: string; color: string; activeFile: string | null; cursor: Cursor | null; joinedAt: number };
export type PeerRef = Pick<Peer, "id" | "userId" | "name" | "color">;

type Client = {
  peer: Peer;
  ws: WebSocket;
  projectId: string;
  alive: boolean;
  /** Timestamps (ms) of recent messages for rate limiting. */
  recent: number[];
  violations: number;
};

export type RealtimeServerOptions = {
  port: number;
  host?: string;
  secret: string;
  log?: (msg: string, meta?: Record<string, unknown>) => void;
  heartbeatMs?: number;
};

export type RealtimeServer = {
  port: number;
  http: Server;
  wss: WebSocketServer;
  rooms: Map<string, Map<string, Client>>;
  stats(): { rooms: number; clients: number };
  close(): Promise<void>;
};

const ref = (p: Peer): PeerRef => ({ id: p.id, userId: p.userId, name: p.name, color: p.color });

function asString(v: unknown, max = 512): string | null {
  return typeof v === "string" && v.length <= max ? v : null;
}

function asCursor(v: unknown): Cursor | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  const path = asString(c.path);
  if (!path || typeof c.line !== "number" || typeof c.column !== "number") return null;
  return { path, line: Math.max(0, Math.floor(c.line)), column: Math.max(0, Math.floor(c.column)) };
}

function asPaths(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length > 200) return null;
  const out: string[] = [];
  for (const p of v) {
    const s = asString(p);
    if (s === null) return null;
    out.push(s);
  }
  return out;
}

export async function createRealtimeServer(opts: RealtimeServerOptions): Promise<RealtimeServer> {
  const log = opts.log ?? (() => undefined);
  const rooms = new Map<string, Map<string, Client>>();
  const http = createServer((req, res) => {
    if (req.url === "/health" || req.url === "/healthz") {
      let clients = 0;
      for (const r of rooms.values()) clients += r.size;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, rooms: rooms.size, clients }));
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Codexa realtime: connect with a WebSocket client");
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });

  const send = (ws: WebSocket, msg: Record<string, unknown>) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };
  const broadcast = (projectId: string, msg: Record<string, unknown>, except?: string) => {
    const room = rooms.get(projectId);
    if (!room) return;
    const data = JSON.stringify(msg);
    for (const c of room.values()) if (c.peer.id !== except && c.ws.readyState === WebSocket.OPEN) c.ws.send(data);
  };

  const leave = (client: Client) => {
    const room = rooms.get(client.projectId);
    if (!room || !room.has(client.peer.id)) return;
    room.delete(client.peer.id);
    if (room.size === 0) rooms.delete(client.projectId);
    broadcast(client.projectId, { type: "leave", id: client.peer.id, userId: client.peer.userId });
    log("leave", { projectId: client.projectId, userId: client.peer.userId, remaining: room.size });
  };

  const overLimit = (client: Client, now: number) => {
    client.recent = client.recent.filter((t) => now - t < 1000);
    client.recent.push(now);
    return client.recent.length > MAX_MESSAGES_PER_SECOND;
  };

  const handleMessage = (client: Client, raw: unknown) => {
    const now = Date.now();
    if (overLimit(client, now)) {
      client.violations++;
      if (client.violations > 200) {
        client.ws.close(4008, "rate limit exceeded");
        return;
      }
      if (client.violations % 20 === 1) send(client.ws, { type: "error", code: "rate_limited", message: `Max ${MAX_MESSAGES_PER_SECOND} messages per second` });
      return;
    }
    let msg: Record<string, unknown>;
    try {
      const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : Array.isArray(raw) ? Buffer.concat(raw).toString("utf8") : String(raw);
      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== "object") throw new Error("not an object");
      msg = parsed as Record<string, unknown>;
    } catch {
      send(client.ws, { type: "error", code: "bad_message", message: "Messages must be JSON objects" });
      return;
    }
    switch (msg.type) {
      case "ping":
        send(client.ws, { type: "pong", t: typeof msg.t === "number" ? msg.t : now });
        return;
      case "presence": {
        if ("activeFile" in msg) client.peer.activeFile = msg.activeFile === null ? null : asString(msg.activeFile);
        if ("cursor" in msg) client.peer.cursor = asCursor(msg.cursor);
        broadcast(client.projectId, { type: "presence", peer: client.peer }, client.peer.id);
        return;
      }
      case "cursor": {
        const cursor = asCursor(msg);
        if (!cursor) {
          send(client.ws, { type: "error", code: "bad_message", message: "cursor needs path, line, column" });
          return;
        }
        client.peer.cursor = cursor;
        client.peer.activeFile = cursor.path;
        broadcast(client.projectId, { type: "cursor", from: ref(client.peer), ...cursor }, client.peer.id);
        return;
      }
      case "file-changed": {
        const paths = asPaths(msg.paths);
        if (!paths) {
          send(client.ws, { type: "error", code: "bad_message", message: "file-changed needs paths: string[]" });
          return;
        }
        broadcast(client.projectId, { type: "file-changed", from: ref(client.peer), paths }, client.peer.id);
        return;
      }
      default:
        send(client.ws, { type: "error", code: "unknown_type", message: `Unknown message type ${String(msg.type)}` });
    }
  };

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage, payload: RealtimeTokenPayload) => {
    const client: Client = {
      ws,
      projectId: payload.projectId,
      alive: true,
      recent: [],
      violations: 0,
      peer: { id: randomBytes(8).toString("hex"), userId: payload.userId, name: payload.name, color: payload.color, activeFile: null, cursor: null, joinedAt: Date.now() },
    };
    let room = rooms.get(client.projectId);
    if (!room) {
      room = new Map();
      rooms.set(client.projectId, room);
    }
    const peers = [...room.values()].map((c) => c.peer);
    room.set(client.peer.id, client);
    send(ws, { type: "welcome", self: client.peer, peers });
    broadcast(client.projectId, { type: "join", peer: client.peer }, client.peer.id);
    log("join", { projectId: client.projectId, userId: client.peer.userId, size: room.size });
    ws.on("pong", () => {
      client.alive = true;
    });
    ws.on("message", (data) => handleMessage(client, data));
    ws.on("close", () => leave(client));
    ws.on("error", () => leave(client));
  });

  http.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const token = url.searchParams.get("token") ?? "";
    const payload = token ? verifyRealtimeToken(token, opts.secret) : null;
    if (!payload) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Type: text/plain\r\n\r\ninvalid or expired token");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req, payload));
  });

  const heartbeat = setInterval(() => {
    for (const room of rooms.values()) {
      for (const c of room.values()) {
        if (!c.alive) {
          c.ws.terminate();
          leave(c);
          continue;
        }
        c.alive = false;
        if (c.ws.readyState === WebSocket.OPEN) c.ws.ping();
      }
    }
  }, opts.heartbeatMs ?? HEARTBEAT_MS);
  heartbeat.unref();

  await new Promise<void>((resolve, reject) => {
    http.once("error", reject);
    http.listen(opts.port, opts.host ?? "0.0.0.0", () => resolve());
  });
  const address = http.address();
  const port = typeof address === "object" && address ? address.port : opts.port;

  return {
    port,
    http,
    wss,
    rooms,
    stats() {
      let clients = 0;
      for (const r of rooms.values()) clients += r.size;
      return { rooms: rooms.size, clients };
    },
    async close() {
      clearInterval(heartbeat);
      for (const room of rooms.values()) for (const c of room.values()) c.ws.close(1001, "server shutting down");
      rooms.clear();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => http.close(() => resolve()));
    },
  };
}
