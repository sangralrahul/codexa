"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { activityVerb } from "@/components/projects/activity-river";
import { absoluteTime } from "@/components/projects/format";
import { shortAgo } from "./grid-bits";

/** One project_activity row for the bell (serializable; from getRecentActivity in the app layout). */
export type BellItem = { id: string; projectId: string; projectName: string; kind: string; actorName: string; createdAt: string; count: number };

function toneOf(kind: string) {
  if (kind === "deployment.live" || kind === "runtime.started") return "ok";
  if (kind === "deployment.failed") return "error";
  if (kind === "deployment.queued") return "warn";
  return undefined;
}

/**
 * The top bar's bell: the newest activity across your workspaces (edits, agent runs, previews,
 * deploys). There is no read/unread state on the server, so it shows no unread badge.
 */
export function ActivityBell({ items }: { items: BellItem[] }) {
  return (
    <Popover>
      <PopoverTrigger className="app-btn app-btn--icon" aria-label="Recent activity">
        <Bell className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="app-grid w-[min(360px,calc(100vw-24px))] p-0">
        <div className="app-box__head">
          <span>Recent activity</span>
          <span>All workspaces</span>
        </div>
        {items.length ? (
          <ol className="app-feed max-h-[360px] overflow-y-auto px-3.5">
            {items.map((a) => (
              <li key={a.id}>
                <span className="app-dot" data-tone={toneOf(a.kind)} aria-hidden="true" />
                <p className="min-w-0 leading-snug">
                  <span className="font-medium text-foreground">{a.actorName}</span> {activityVerb(a.kind, a.count)}{" "}
                  <Link href={`/projects/${a.projectId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                    {a.projectName}
                  </Link>
                </p>
                <time dateTime={a.createdAt} title={absoluteTime(a.createdAt)} suppressHydrationWarning>
                  {shortAgo(a.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="px-3.5 py-4 text-[13px] text-muted-foreground">No activity yet. Edits, agent runs, previews and deploys show up here.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
