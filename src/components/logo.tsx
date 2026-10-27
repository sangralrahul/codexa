import Link from "next/link";
import { cn } from "@/lib/utils";
import { CODEXA_MARK_PATH } from "@/components/brand/codexa-mark";

export type LogoState = "idle" | "running" | "success" | "error";

/**
 * The Codexa mark (two interlocking brackets forming a hexagon), in the foreground colour.
 * `state` (IDE, loading and launch screens):
 *  - running: the mark turns half a revolution and settles, on repeat (it is 180°-symmetric);
 *  - success: a small spring and a success ring;
 *  - error:   a short shake and a danger notch at the corner;
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
      <g className="logo-mark__glyph">
        <path d={CODEXA_MARK_PATH} transform="translate(1 1) scale(0.3)" className="fill-foreground" />
      </g>
      {state === "success" ? <circle className="logo-mark__halo" cx="16" cy="16" r="17" stroke="var(--success)" strokeWidth="1.5" /> : null}
      {state === "error" ? <circle className="logo-mark__notch" cx="29" cy="3" r="3.5" fill="var(--danger)" stroke="var(--background)" strokeWidth="1.5" /> : null}
    </svg>
  );
}

/** The wordmark: "codexa" set lowercase in the display face, tight and heavy. */
export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("font-display text-[21px] font-bold leading-none tracking-[-0.035em]", className)}>codexa</span>;
}

export function Logo({ href = "/", className, withText = true }: { href?: string; className?: string; withText?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)} aria-label="Codexa home">
      <LogoMark />
      {withText ? <Wordmark /> : null}
    </Link>
  );
}
