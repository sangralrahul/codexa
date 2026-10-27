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
  const toggled = React.useRef(false);
  const backRef = React.useRef<HTMLButtonElement>(null);
  const runRef = React.useRef<HTMLButtonElement>(null);
  // The pressed control unmounts, so hand focus to its counterpart (only after a real toggle).
  React.useEffect(() => {
    if (!toggled.current) return;
    (live ? backRef : runRef).current?.focus();
  }, [live]);
  const toggle = (next: boolean) => {
    toggled.current = true;
    setLive(next);
  };

  return (
    <div className={cn("relative", className)}>
      {live ? (
        <>
          <iframe title={`${name}, running live`} sandbox="allow-scripts" srcDoc={srcDoc} referrerPolicy="no-referrer" className="develop block aspect-[16/10] w-full border-0 bg-white" />
          {/* A toolbar under the frame, so nothing covers the running template. */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface/90 px-3 py-2">
            <span className="inline-flex items-center gap-2 text-[12px] font-medium text-foreground">
              <span className="live-dot" aria-hidden="true" />
              Live: running in a sandboxed frame in your browser
            </span>
            <button
              ref={backRef}
              type="button"
              onClick={() => toggle(false)}
              className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ImageIcon className="size-3.5" aria-hidden="true" />
              Back to the screenshot
            </button>
          </div>
          <p className="sr-only" role="status">
            {name} is running in a sandboxed frame.
          </p>
        </>
      ) : (
        <>
          {children}
          <div className="absolute bottom-3 left-3 z-[3]">
            <button
              ref={runRef}
              type="button"
              onClick={() => toggle(true)}
              className="group/run inline-flex h-9 items-center gap-2 rounded-full bg-foreground pl-1.5 pr-4 text-[13px] font-medium text-background shadow-xl transition-[scale,opacity] duration-(--dur-2) hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97]"
            >
              <span className="grid size-6 place-items-center rounded-full bg-background/15">
                <Play className="size-3 translate-x-px fill-current" aria-hidden="true" />
              </span>
              Run it here
              <span className="sr-only"> (loads {name} in a sandboxed frame)</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
