"use client";

import * as React from "react";
import { Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { useScript } from "./use-script";

export type DeployVersion = { id: string; when: string; note: string };

const DEFAULT_VERSIONS: DeployVersion[] = [
  { id: "v3", when: "just now", note: "GST totals and filters" },
  { id: "v2", when: "yesterday", note: "Invoice table" },
  { id: "v1", when: "3 days ago", note: "First deploy" },
];
const ROW = 44; // px, row pitch (height 40 + gap 4)

/**
 * Deploy history (M17): a new version ships to the top and the Live badge glides onto it;
 * "Roll back" on any row glides Live there (420ms spring). Interactive; sample data on a
 * sample domain. Final frame on the server and when calm.
 */
export function DeployHistory({
  playing,
  className,
  versions = DEFAULT_VERSIONS,
  host = "invoice-tracker.example.com",
}: {
  playing?: boolean;
  className?: string;
  versions?: DeployVersion[];
  host?: string;
}) {
  // Cue 0: older versions only, live on v2; cue 1: newest row deploys; cue 2: it goes live.
  const { ref, index, started } = useScript([0, 700, 1900], 2400, playing);
  const [chosen, setChosen] = React.useState<number | null>(null);
  const showNewest = !started || index >= 1;
  const newestReady = !started || index >= 2;
  const list = showNewest ? versions : versions.slice(1);
  const offset = showNewest ? 0 : 1;
  const scriptedLive = newestReady ? 0 : 1;
  const live = chosen ?? scriptedLive;

  const rollBack = (i: number) => {
    setChosen(i);
    toast.info(`Rolled back to ${versions[i].id} · illustrative`, "On Codexa hosting, rollback re-points the site to an earlier build.");
  };

  return (
    <div ref={ref} className={cn("flex w-full min-w-0 flex-col gap-2.5 text-[13px] [contain:inline-size]", className)}>
      <div aria-hidden="true" className="flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1.5 font-mono text-[11.5px] shadow-[inset_0_1px_0_var(--hairline)]">
        <Globe className="size-3.5 text-muted-foreground" />
        <span className="truncate">{host}</span>
        <span className="live-dot ml-auto" />
      </div>
      <div className="relative" style={{ height: versions.length * ROW - 4 }}>
        {/* The Live badge is one element that glides between rows. */}
        <span
          aria-hidden="true"
          className="absolute right-2 z-[2] inline-flex h-6 items-center gap-1.5 rounded-full bg-success/15 px-2 text-[11px] font-medium text-success transition-transform duration-[420ms] ease-spring calm:transition-none"
          style={{ top: 8, transform: `translateY(${(live - offset) * ROW}px)` }}
        >
          <span className="live-dot" /> Live
        </span>
        <ul className="space-y-1">
          {list.map((v) => {
            const i = versions.indexOf(v);
            const deploying = i === 0 && started && index === 1;
            return (
              <li
                key={v.id}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-[10px] border px-3 transition-[border-color,background-color] duration-300",
                  i === live ? "border-success/30 bg-success/[0.05]" : "border-border bg-card",
                  i === 0 && started && index >= 1 && "pop-in",
                )}
              >
                <span className="w-6 font-mono text-[12px] font-semibold">{v.id}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{v.note}</span>
                <span className="hidden shrink-0 text-[11.5px] text-muted-foreground sm:inline">{v.when}</span>
                <span className="w-[86px] shrink-0 text-right">
                  {deploying ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Deploying
                    </span>
                  ) : i !== live ? (
                    <button
                      type="button"
                      onClick={() => rollBack(i)}
                      aria-label={`Roll back to ${v.id} (illustration)`}
                      className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                    >
                      Roll back
                    </button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-[11px] text-muted-foreground">Sample data · sample domain</p>
    </div>
  );
}
