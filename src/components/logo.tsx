import Link from "next/link";
import { cn } from "@/lib/utils";

export type LogoState = "idle" | "running" | "success" | "error";

/**
 * Geometric C mark: a bracket opening to the right with the signal caret inside.
 * `state` (IDE, loading and launch screens):
 *  - running: a comet travels the tile edge and the caret blinks;
 *  - success: the tile settles with a small spring and a success ring;
 *  - error:   the caret turns danger and a notch marks the corner;
 *  - idle:    static. Calm keeps every state static.
 */
export function LogoMark({ className, size = 28, state = "idle" }: { className?: string; size?: number; state?: LogoState }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      data-state={state}
      className={cn("logo-mark shrink-0 overflow-visible", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-foreground" />
      <path d="M21 10H13a4 4 0 0 0-4 4v4a4 4 0 0 0 4 4h8" stroke="var(--background)" strokeWidth="3" strokeLinecap="round" />
      <rect className="logo-mark__caret" x="18" y="14.5" width="6" height="3" rx="1.5" fill={state === "error" ? "var(--danger)" : "var(--signal)"} />
      {state === "running" ? (
        <rect className="logo-mark__ring" x="0.75" y="0.75" width="30.5" height="30.5" rx="7.25" pathLength={100} stroke="var(--signal)" strokeWidth="1.5" strokeLinecap="round" />
      ) : null}
      {state === "success" ? <rect className="logo-mark__halo" x="-1.5" y="-1.5" width="35" height="35" rx="9.5" stroke="var(--success)" strokeWidth="1.5" /> : null}
      {state === "error" ? <circle className="logo-mark__notch" cx="30" cy="2" r="3.5" fill="var(--danger)" stroke="var(--background)" strokeWidth="1.5" /> : null}
    </svg>
  );
}

export function Logo({ href = "/", className, withText = true }: { href?: string; className?: string; withText?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)} aria-label="Codexa home">
      <LogoMark />
      {withText ? <span className="text-[15px] font-semibold uppercase tracking-[0.18em]">Codexa</span> : null}
    </Link>
  );
}
