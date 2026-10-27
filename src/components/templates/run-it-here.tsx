"use client";

import * as React from "react";
import { Image as ImageIcon, Play } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Run it here" for static templates (PLAN §5.4, stretch). Shows the screenshot (children) until
 * asked, then mounts the template's own files as a srcdoc iframe with sandbox="allow-scripts" and
 * no allow-same-origin: an opaque origin that cannot touch this site. Nothing loads until the click.
 */
export function RunItHere({ srcDoc, name, children, className }: { srcDoc: string; name: string; children: React.ReactNode; className?: string }) {
  const [live, setLive] = React.useState(false);

  return (
    <div className={cn("relative", className)}>
      {live ? (
        <iframe
          title={`${name}, running live`}
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          referrerPolicy="no-referrer"
          className="develop block aspect-[16/10] w-full border-0 bg-white"
        />
      ) : (
        children
      )}
      <div className="absolute bottom-3 left-3 z-[3] flex flex-wrap items-center gap-2">
        {live ? (
          <>
            <span className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-card/90 px-3 text-[12px] font-medium shadow-lg backdrop-blur-md">
              <span className="live-dot" aria-hidden="true" />
              Live: running in a sandboxed frame in your browser
            </span>
            <button
              type="button"
              onClick={() => setLive(false)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 text-[12px] font-medium text-muted-foreground shadow-lg backdrop-blur-md transition-colors hover:text-foreground"
            >
              <ImageIcon className="size-3.5" aria-hidden="true" />
              Screenshot
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setLive(true)}
            className="group/run inline-flex h-9 items-center gap-2 rounded-full bg-foreground pl-1.5 pr-4 text-[13px] font-medium text-background shadow-xl transition-[scale,opacity] duration-(--dur-2) hover:opacity-90 active:scale-[0.97]"
          >
            <span className="grid size-6 place-items-center rounded-full bg-background/15">
              <Play className="size-3 translate-x-px fill-current" aria-hidden="true" />
            </span>
            Run it here
            <span className="sr-only"> (loads {name} in a sandboxed frame)</span>
          </button>
        )}
      </div>
      {live ? (
        <p className="sr-only" role="status">
          {name} is running in a sandboxed frame.
        </p>
      ) : null}
    </div>
  );
}
