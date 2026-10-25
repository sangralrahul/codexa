"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

/** Peer shape mirrored from services/realtime/server.ts. */
export type PresenceCursor = { path: string; line: number; column: number };
export type PresencePeer = { id: string; userId: string; name: string; color: string; activeFile: string | null; cursor: PresenceCursor | null; joinedAt: number };
export type PresenceStatus = "idle" | "connecting" | "connected" | "reconnecting" | "unavailable" | "unauthorized";

export type OutgoingMessage =
  | { type: "presence"; activeFile?: string | null; cursor?: PresenceCursor | null }
  | { type: "file-changed"; paths: string[] }
  | { type: "cursor"; path: string; line: number; column: number }
  | { type: "ping"; t?: number };

export type IncomingMessage =
  | { type: "welcome"; self: PresencePeer; peers: PresencePeer[] }
  | { type: "join"; peer: PresencePeer }
  | { type: "leave"; id: string; userId: string }
  | { type: "presence"; peer: PresencePeer }
  | { type: "file-changed"; from: Pick<PresencePeer, "id" | "userId" | "name" | "color">; paths: string[] }
  | { type: "cursor"; from: Pick<PresencePeer, "id" | "userId" | "name" | "color">; path: string; line: number; column: number }
  | { type: "pong"; t: number }
  | { type: "error"; code: string; message: string };

type TokenResponse = { token: string; url: string | null; expiresAt: string; self: { userId: string; name: string; color: string } };

export type UsePresence = {
  status: PresenceStatus;
  peers: PresencePeer[];
  self: PresencePeer | null;
  /** Human readable reason when status is "unavailable" / "unauthorized". */
  error: string | null;
  send: (msg: OutgoingMessage) => boolean;
  /** Subscribe to raw server messages (file-changed / cursor from peers). Returns an unsubscribe function. */
  subscribe: (cb: (msg: IncomingMessage) => void) => () => void;
  reconnect: () => void;
};

const MAX_BACKOFF_MS = 30_000;
const MIN_SEND_INTERVAL_MS = 50; // stays under the server's 20 msg/s limit

/**
 * Join the project's presence room. Fetches a signed token from the API, connects to the
 * realtime server, auto-reconnects with exponential backoff, and exposes the peer list.
 * When the realtime URL is not configured or the socket cannot connect, status becomes
 * "unavailable" with an explanatory `error`; nothing is faked.
 */
export function usePresence(projectId: string, opts: { enabled?: boolean } = {}): UsePresence {
  const enabled = opts.enabled ?? true;
  const [status, setStatus] = useState<PresenceStatus>("idle");
  const [peers, setPeers] = useState<PresencePeer[]>([]);
  const [self, setSelf] = useState<PresencePeer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const listeners = useRef(new Set<(msg: IncomingMessage) => void>());
  const attempt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closed = useRef(false);
  const lastSent = useRef(0);
  const everConnected = useRef(false);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    closed.current = false;
    attempt.current = 0;
    everConnected.current = false;

    const schedule = (reason: string) => {
      if (closed.current) return;
      attempt.current += 1;
      const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.min(attempt.current, 5)) + Math.random() * 500;
      if (attempt.current >= 3 && !everConnected.current) {
        setStatus("unavailable");
        setError("Realtime server not reachable");
      } else {
        setStatus("reconnecting");
        setError(reason);
      }
      timer.current = setTimeout(connect, delay);
    };

    const connect = async () => {
      if (closed.current) return;
      setStatus(attempt.current === 0 ? "connecting" : "reconnecting");
      let tok: TokenResponse;
      try {
        tok = await api<TokenResponse>(`/api/v1/projects/${encodeURIComponent(projectId)}/realtime-token`);
      } catch (err) {
        const e = err as { status?: number; message?: string };
        if (e.status === 401 || e.status === 403 || e.status === 404) {
          setStatus("unauthorized");
          setError(e.message ?? "Not allowed to join this project");
          return;
        }
        schedule("Could not fetch a presence token");
        return;
      }
      if (!tok.url) {
        setStatus("unavailable");
        setError("Realtime server not configured (NEXT_PUBLIC_REALTIME_URL is missing)");
        return;
      }
      if (closed.current) return;
      let ws: WebSocket;
      try {
        const u = new URL(tok.url);
        u.searchParams.set("token", tok.token);
        ws = new WebSocket(u.toString());
      } catch {
        setStatus("unavailable");
        setError("Realtime server URL is invalid");
        return;
      }
      wsRef.current = ws;
      let opened = false;
      ws.onopen = () => {
        opened = true;
        everConnected.current = true;
        attempt.current = 0;
        setStatus("connected");
        setError(null);
      };
      ws.onmessage = (ev) => {
        let msg: IncomingMessage;
        try {
          msg = JSON.parse(String(ev.data)) as IncomingMessage;
        } catch {
          return;
        }
        switch (msg.type) {
          case "welcome":
            setSelf(msg.self);
            setPeers(msg.peers);
            break;
          case "join":
            setPeers((p) => (p.some((x) => x.id === msg.peer.id) ? p : [...p, msg.peer]));
            break;
          case "leave":
            setPeers((p) => p.filter((x) => x.id !== msg.id));
            break;
          case "presence":
            setPeers((p) => p.map((x) => (x.id === msg.peer.id ? msg.peer : x)));
            break;
          case "cursor":
            setPeers((p) => p.map((x) => (x.id === msg.from.id ? { ...x, activeFile: msg.path, cursor: { path: msg.path, line: msg.line, column: msg.column } } : x)));
            break;
          default:
            break;
        }
        for (const cb of listeners.current) cb(msg);
      };
      ws.onclose = (ev) => {
        if (wsRef.current === ws) wsRef.current = null;
        setPeers([]);
        if (closed.current) return;
        if (ev.code === 4008) {
          setStatus("unavailable");
          setError("Disconnected: too many messages");
          return;
        }
        schedule(opened ? "Connection lost, reconnecting" : "Realtime server not reachable");
      };
      ws.onerror = () => {
        // onclose follows; nothing to do here.
      };
    };

    void connect();
    return () => {
      closed.current = true;
      if (timer.current) clearTimeout(timer.current);
      const ws = wsRef.current;
      wsRef.current = null;
      ws?.close(1000, "page closed");
      setPeers([]);
      setSelf(null);
      setStatus("idle");
    };
  }, [projectId, enabled, epoch]);

  const send = useCallback((msg: OutgoingMessage) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    const now = Date.now();
    if (msg.type === "cursor" && now - lastSent.current < MIN_SEND_INTERVAL_MS) return false;
    lastSent.current = now;
    ws.send(JSON.stringify(msg));
    return true;
  }, []);

  const subscribe = useCallback((cb: (msg: IncomingMessage) => void) => {
    listeners.current.add(cb);
    return () => {
      listeners.current.delete(cb);
    };
  }, []);

  const reconnect = useCallback(() => setEpoch((e) => e + 1), []);

  return { status, peers, self, error, send, subscribe, reconnect };
}
