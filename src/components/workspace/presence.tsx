"use client";

import * as React from "react";
import { usePresence, type PresencePeer, type UsePresence } from "@/lib/client/presence";
import { on } from "@/lib/client/events";
import { Tooltip } from "@/components/ui/tooltip";
import { Avatar } from "@/components/ui/avatar";

/**
 * One realtime connection per workspace, shared by the header avatars and the status bar.
 * Mirrors the local editor's open file to peers and relays codexa:files-changed. Peers are
 * only ever the real ones the server reports; nothing renders until the socket is connected.
 */
const PresenceContext = React.createContext<UsePresence | null>(null);

export function PresenceProvider({ projectId, activeFile, children }: { projectId: string; activeFile?: string | null; children: React.ReactNode }) {
  const presence = usePresence(projectId);
  const { status, send } = presence;

  React.useEffect(() => {
    if (status !== "connected") return;
    send({ type: "presence", activeFile: activeFile ?? null });
  }, [status, activeFile, send]);

  React.useEffect(() => {
    const offChanged = on("codexa:files-changed", (d) => {
      if (d.source !== "github" && d.paths.length) send({ type: "file-changed", paths: d.paths.slice(0, 200) });
    });
    return () => offChanged();
  }, [send]);

  return <PresenceContext.Provider value={presence}>{children}</PresenceContext.Provider>;
}

export function usePresenceContext() {
  return React.useContext(PresenceContext);
}

/** Distinct other people in the room (a user with two tabs counts once). */
export function usePeers() {
  const p = usePresenceContext();
  return React.useMemo(() => {
    if (!p || p.status !== "connected") return { connected: false, others: [] as PresencePeer[], self: null as PresencePeer | null };
    const distinct = new Map<string, PresencePeer>();
    for (const peer of p.peers) if (peer.id !== p.self?.id && peer.userId !== p.self?.userId && !distinct.has(peer.userId)) distinct.set(peer.userId, peer);
    return { connected: true, others: [...distinct.values()], self: p.self };
  }, [p]);
}

/** Header avatar stack: only when connected and only real peers (nothing for a solo session). */
export function PresenceAvatars() {
  const { connected, others } = usePeers();
  if (!connected || !others.length) return null;
  const visible = others.slice(0, 4);
  const extra = others.length - visible.length;
  return (
    <ul className="ws-pill-in flex items-center -space-x-1.5" aria-label={`${others.length} other ${others.length === 1 ? "person" : "people"} in this project`}>
      {visible.map((p) => (
        <li key={p.id}>
          <Tooltip content={p.activeFile ? `${p.name} · ${p.activeFile}` : p.name}>
            <span tabIndex={0} className="inline-flex rounded-full ring-2 ring-background focus-visible:outline-2 focus-visible:outline-ring">
              <Avatar name={p.name} seed={p.userId} size="sm" presence="online" labelled />
            </span>
          </Tooltip>
        </li>
      ))}
      {extra > 0 ? (
        <li className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background" aria-label={`${extra} more`}>
          +{extra}
        </li>
      ) : null}
    </ul>
  );
}
