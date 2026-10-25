"use client";

import { useEffect } from "react";
import { RefreshCw, Users } from "lucide-react";
import { usePresence, type PresencePeer } from "@/lib/client/presence";
import { on } from "@/lib/client/events";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function Avatar({ peer, className }: { peer: PresencePeer; className?: string }) {
  return (
    <span
      className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-background text-[11px] font-semibold text-white", className)}
      style={{ backgroundColor: peer.color }}
      aria-hidden="true"
    >
      {initials(peer.name)}
    </span>
  );
}

/**
 * Live collaborators for a project: avatar stack with names and active files, and a "Live: N" indicator.
 * Mirrors the local editor's open file to peers (listens to codexa:open-file) and relays codexa:files-changed.
 */
export function Presence({ projectId, activeFile, compact }: { projectId: string; activeFile?: string | null; compact?: boolean }) {
  const { status, peers, self, error, send, reconnect } = usePresence(projectId);

  useEffect(() => {
    if (status !== "connected") return;
    send({ type: "presence", activeFile: activeFile ?? null });
  }, [status, activeFile, send]);

  useEffect(() => {
    const offOpen = on("codexa:open-file", (d) => {
      send({ type: "presence", activeFile: d.path });
    });
    const offChanged = on("codexa:files-changed", (d) => {
      if (d.source !== "github" && d.paths.length) send({ type: "file-changed", paths: d.paths.slice(0, 200) });
    });
    return () => {
      offOpen();
      offChanged();
    };
  }, [send]);

  const others = peers.filter((p) => p.id !== self?.id);
  // Distinct users (a user with two tabs counts once).
  const distinct = new Map<string, PresencePeer>();
  for (const p of others) if (!distinct.has(p.userId)) distinct.set(p.userId, p);
  const live = distinct.size + (self ? 1 : 0);

  // Realtime is optional: deployments without it (e.g. Vercel) simply show nothing.
  if (status === "not_configured") return null;

  if (status === "unavailable" || status === "unauthorized") {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", compact && "max-w-[12rem]")} role="status" aria-live="polite">
        <Users className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate" title={error ?? undefined}>
          {status === "unauthorized" ? "Presence unavailable" : "Realtime server not reachable"}
        </span>
        {status === "unavailable" ? (
          <button type="button" onClick={reconnect} className="rounded p-0.5 hover:bg-muted" aria-label="Retry realtime connection">
            <RefreshCw className="size-3" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    );
  }

  if (status !== "connected") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status" aria-live="polite">
        <span className="size-2 animate-pulse rounded-full bg-muted-foreground/60" aria-hidden="true" />
        {status === "reconnecting" ? "Reconnecting…" : "Connecting…"}
      </div>
    );
  }

  const visible = [...distinct.values()].slice(0, 5);
  const extra = distinct.size - visible.length;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2" role="status" aria-live="polite" aria-label={`${live} ${live === 1 ? "person" : "people"} live in this project`}>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs">
          <span className="size-2 rounded-full bg-success" aria-hidden="true" />
          Live: {live}
        </span>
        {visible.length ? (
          <ul className="flex -space-x-2" aria-label="Collaborators">
            {self ? (
              <li>
                <Tooltip content={`${self.name} (you)`}>
                  <span tabIndex={0} className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Avatar peer={self} />
                    <span className="sr-only">{self.name} (you)</span>
                  </span>
                </Tooltip>
              </li>
            ) : null}
            {visible.map((p) => (
              <li key={p.id}>
                <Tooltip content={p.activeFile ? `${p.name} — editing ${p.activeFile}` : p.name}>
                  <span tabIndex={0} className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Avatar peer={p} />
                    <span className="sr-only">
                      {p.name}
                      {p.activeFile ? `, editing ${p.activeFile}` : ""}
                    </span>
                  </span>
                </Tooltip>
              </li>
            ))}
            {extra > 0 ? (
              <li className="inline-flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[11px] font-medium" aria-label={`${extra} more`}>
                +{extra}
              </li>
            ) : null}
          </ul>
        ) : compact ? null : (
          <span className="text-xs text-muted-foreground">Only you</span>
        )}
      </div>
    </TooltipProvider>
  );
}
