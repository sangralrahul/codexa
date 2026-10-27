import * as React from "react";
import { ExternalLink, Lock, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

function splitUrl(url: string) {
  const clean = url.replace(/^[a-z]+:\/\//i, "");
  const i = clean.indexOf("/");
  return i < 0 ? { host: clean, path: "" } : { host: clean.slice(0, i), path: clean.slice(i) };
}

/**
 * A browser card around a page depiction (screenshots, previews). Decorative chrome:
 * "full" = reload, URL pill (lock, host, muted path) and open-in-new; "minimal" = URL pill only.
 * The chrome is aria-hidden; describe the content with your own caption.
 */
export function BrowserFrame({
  url,
  children,
  className,
  chrome = "full",
  bodyClassName,
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
  chrome?: "full" | "minimal";
  bodyClassName?: string;
}) {
  const { host, path } = splitUrl(url);
  return (
    <div className={cn("relative overflow-hidden rounded-[14px] border border-border-strong bg-card shadow-lg", className)}>
      <div aria-hidden="true" className="flex h-10 items-center gap-2 border-b border-border bg-surface/80 px-3">
        {chrome === "full" ? <RotateCw className="size-3.5 shrink-0 text-muted-foreground" /> : null}
        <div className={cn("flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded-full bg-muted px-2.5 font-mono text-[11px] shadow-[inset_0_0_0_1px_var(--border)] [contain:inline-size]", chrome === "minimal" && "mx-auto max-w-[70%]")}>
          <Lock className="size-3 shrink-0 text-muted-foreground" />
          <span className="truncate">
            <span className="text-foreground/85">{host}</span>
            <span className="text-muted-foreground">{path}</span>
          </span>
        </div>
        {chrome === "full" ? <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" /> : null}
      </div>
      <div className={cn("relative", bodyClassName)}>{children}</div>
    </div>
  );
}
