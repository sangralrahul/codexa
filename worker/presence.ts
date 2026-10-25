import { DurableObject } from "cloudflare:workers";
import type { Env } from "./env";

/**
 * Realtime presence for one project (same protocol as services/realtime):
 *   client → { type: "presence", activeFile?, cursor? } | { type: "file-changed", paths } | { type: "cursor", path, line, column } | { type: "ping" }
 *   server → welcome / join / leave / presence / file-changed / cursor / pong / error
 * Uses WebSocket hibernation: idle rooms cost nothing.
 */
type Cursor = { path: string; line: number; column: number };
type Peer = { id: string; userId: string; name: string; color: string; activeFile: string | null; cursor: Cursor | null; joinedAt: number };
type Attachment = { peer: Peer; recent: number[]; violations: number };

const MAX_MESSAGE_BYTES = 16 * 1024;
const MAX_PER_SECOND = 20;

const str = (v: unknown, max = 512) => (typeof v === "string" && v.length <= max ? v : null);
function cursorOf(v: unknown): Cursor | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  const path = str(c.path);
  if (!path || typeof c.line !== "number" || typeof c.column !== "number") return null;
  return { path, line: Math.max(0, Math.floor(c.line)), column: Math.max(0, Math.floor(c.column)) };
}
const ref = (p: Peer) => ({ id: p.id, userId: p.userId, name: p.name, color: p.color });

export class PresenceRoom extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") return new Response("Expected a WebSocket", { status: 426 });
    const who = JSON.parse(request.headers.get("x-codexa-peer") ?? "{}") as { userId?: string; name?: string; color?: string };
    if (!who.userId) return new Response("Missing peer", { status: 400 });
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    const peer: Peer = { id: crypto.randomUUID().replace(/-/g, "").slice(0, 16), userId: who.userId, name: who.name ?? "Someone", color: who.color ?? "#2563eb", activeFile: null, cursor: null, joinedAt: Date.now() };
    const peers = this.peers();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ peer, recent: [], violations: 0 } satisfies Attachment);
    server.send(JSON.stringify({ type: "welcome", self: peer, peers }));
    this.broadcast({ type: "join", peer }, server);
    return new Response(null, { status: 101, webSocket: client });
  }

  private peers(): Peer[] {
    return this.ctx.getWebSockets().map((ws) => (ws.deserializeAttachment() as Attachment | null)?.peer).filter((p): p is Peer => Boolean(p));
  }

  private broadcast(msg: unknown, except?: WebSocket) {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      try {
        ws.send(data);
      } catch {
        /* closing */
      }
    }
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const att = ws.deserializeAttachment() as Attachment;
    const now = Date.now();
    att.recent = att.recent.filter((t) => now - t < 1000);
    att.recent.push(now);
    if (att.recent.length > MAX_PER_SECOND) {
      att.violations++;
      ws.serializeAttachment(att);
      if (att.violations > 200) ws.close(4008, "rate limit exceeded");
      else if (att.violations % 20 === 1) ws.send(JSON.stringify({ type: "error", code: "rate_limited", message: `Max ${MAX_PER_SECOND} messages per second` }));
      return;
    }
    const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
    if (text.length > MAX_MESSAGE_BYTES) {
      ws.close(1009, "message too large");
      return;
    }
    let msg: Record<string, unknown>;
    try {
      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== "object") throw new Error();
      msg = parsed as Record<string, unknown>;
    } catch {
      ws.send(JSON.stringify({ type: "error", code: "bad_message", message: "Messages must be JSON objects" }));
      return;
    }
    const peer = att.peer;
    switch (msg.type) {
      case "ping":
        ws.send(JSON.stringify({ type: "pong", t: typeof msg.t === "number" ? msg.t : now }));
        break;
      case "presence":
        if ("activeFile" in msg) peer.activeFile = msg.activeFile === null ? null : str(msg.activeFile);
        if ("cursor" in msg) peer.cursor = cursorOf(msg.cursor);
        this.broadcast({ type: "presence", peer }, ws);
        break;
      case "cursor": {
        const c = cursorOf(msg);
        if (!c) {
          ws.send(JSON.stringify({ type: "error", code: "bad_message", message: "cursor needs path, line, column" }));
          break;
        }
        peer.cursor = c;
        peer.activeFile = c.path;
        this.broadcast({ type: "cursor", from: ref(peer), ...c }, ws);
        break;
      }
      case "file-changed": {
        const paths = Array.isArray(msg.paths) && msg.paths.length <= 200 && msg.paths.every((p) => typeof p === "string" && p.length <= 512) ? (msg.paths as string[]) : null;
        if (!paths) {
          ws.send(JSON.stringify({ type: "error", code: "bad_message", message: "file-changed needs paths: string[]" }));
          break;
        }
        this.broadcast({ type: "file-changed", from: ref(peer), paths }, ws);
        break;
      }
      default:
        ws.send(JSON.stringify({ type: "error", code: "unknown_type", message: `Unknown message type ${String(msg.type)}` }));
    }
    att.peer = peer;
    ws.serializeAttachment(att);
  }

  async webSocketClose(ws: WebSocket) {
    const att = ws.deserializeAttachment() as Attachment | null;
    if (att) this.broadcast({ type: "leave", id: att.peer.id, userId: att.peer.userId }, ws);
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws);
  }
}
