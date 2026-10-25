import Link from "next/link";
import { cn } from "@/lib/utils";

/** Geometric C mark: three stacked bars opening to the right, suggesting code brackets. */
export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" fill="currentColor" className="text-foreground" />
      <path d="M21 10H13a4 4 0 0 0-4 4v4a4 4 0 0 0 4 4h8" stroke="var(--background)" strokeWidth="3" strokeLinecap="round" />
      <rect x="18" y="14.5" width="6" height="3" rx="1.5" fill="var(--primary)" />
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
