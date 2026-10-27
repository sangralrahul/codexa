import * as React from "react";
import { Code2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo";

/**
 * The Codexa workspace window (elevation e4: 18px radius, stage shadow, ember rim, 44px glass header).
 * Mirrors the real IDE chrome — logo, "workspace › project", a Preview | Code switch — with no
 * traffic lights. Header decorations are aria-hidden; `status` and `toolbar` render as given
 * (they may hold real controls). Put an <IllustrationBadge> in `badge` for depictions.
 */
export function AppWindow({
  project = "my-app",
  workspace = "Your workspace",
  status,
  view,
  toolbar,
  badge,
  children,
  className,
  bodyClassName,
}: {
  project?: string;
  workspace?: string;
  status?: React.ReactNode;
  /** Which canvas tab looks active in the header. Omit to hide the switch. */
  view?: "preview" | "code";
  toolbar?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("e4 relative flex w-full min-w-0 flex-col overflow-hidden text-[13px] [contain:inline-size]", className)}>
      <div className="glass relative z-[1] flex h-11 shrink-0 items-center gap-3 border-b border-border px-3.5">
        <div aria-hidden="true" className="flex min-w-0 items-center gap-2">
          <LogoMark size={18} />
          <span className="hidden truncate text-muted-foreground sm:inline">{workspace}</span>
          <span className="hidden text-foreground-dim sm:inline">›</span>
          <span className="truncate font-medium text-foreground">{project}</span>
        </div>
        {view ? (
          <div aria-hidden="true" className="mx-auto hidden items-center rounded-[9px] bg-muted p-0.5 shadow-[inset_0_0_0_1px_var(--border)] md:flex">
            {(["preview", "code"] as const).map((v) => (
              <span
                key={v}
                className={cn(
                  "inline-flex h-6 items-center gap-1.5 rounded-[7px] px-2.5 text-[12px] font-medium transition-[color,background-color,box-shadow] duration-300",
                  view === v ? "bg-card text-foreground shadow-[var(--shadow-sm),inset_0_0_0_1px_var(--border)]" : "text-muted-foreground",
                )}
              >
                {v === "preview" ? <Eye className="size-3.5" /> : <Code2 className="size-3.5" />}
                {v === "preview" ? "Preview" : "Code"}
              </span>
            ))}
          </div>
        ) : (
          <span className="mx-auto" />
        )}
        <div className="flex min-w-0 shrink-0 items-center gap-2 overflow-hidden">
          {status ? <span className="hidden min-w-0 sm:contents">{status}</span> : null}
          {toolbar}
        </div>
      </div>
      {badge ? <div className="absolute right-3 top-14 z-[3]">{badge}</div> : null}
      <div className={cn("relative min-h-0 flex-1", bodyClassName)}>{children}</div>
    </div>
  );
}
