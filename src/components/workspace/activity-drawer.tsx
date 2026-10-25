"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { activityApi } from "@/lib/client/workspace/api";
import type { ActivityDto } from "@/lib/client/workspace/types";
import { Button } from "@/components/ui/button";
import { Alert, Skeleton } from "@/components/ui/misc";
import { Drawer } from "./drawer";
import { relativeTime } from "@/components/projects/format";

export function ActivityDrawer({ projectId, open, onOpenChange }: { projectId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Activity" description="Who changed what in this project.">
      {/* Body unmounts with the drawer, so it reloads on every open. */}
      <Body projectId={projectId} />
    </Drawer>
  );
}

function Body({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<ActivityDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await activityApi.list(projectId, 100);
      setRows(res.activity);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load activity");
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    activityApi
      .list(projectId, 100)
      .then((res) => {
        if (cancelled) return;
        setRows(res.activity);
        setError(null);
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load activity"));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <>
      <div className="p-4">
        {error ? <Alert variant="danger">{error}</Alert> : null}
        {!rows ? (
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-4" aria-label="Activity log">
            {rows.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-border-strong" aria-hidden="true" />
                <p className="text-sm">{a.message}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {a.actorName} · {relativeTime(a.createdAt)} · <code className="font-mono text-[10px]">{a.kind}</code>
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="border-t border-border px-4 py-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setLoading(true);
            void load().finally(() => setLoading(false));
          }}
          disabled={loading}
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} /> Refresh
        </Button>
      </div>
    </>
  );
}
