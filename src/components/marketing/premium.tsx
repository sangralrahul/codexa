import * as React from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Marketing primitives shared by every marketing page: a dark, neutral site (near-black page,
 * #16161a panels, white and grey type) with one blue accent for the primary button, links, focus
 * rings and the live dot. Plain server components on the mk-* classes in marketing.css; every
 * colour comes from a token.
 */

/** A very faint monochrome wash behind a hero (decorative; parent is `relative isolate`). No colour, no motion. */
export function Mesh({ className, variant = "hero" }: { className?: string; variant?: "hero" | "soft" | "band" | "glow" }) {
  return <div aria-hidden="true" className={cn("mk-mesh", variant === "soft" && "mk-mesh--soft", variant === "band" && "mk-mesh--band", variant === "glow" && "mk-mesh--glow", className)} />;
}

/** Headlines are plain white: `phrase` is accepted for existing callers and rendered as ordinary text. */
export function GradientText({ text, phrase }: { text: string; phrase?: string }) {
  void phrase;
  return <>{text}</>;
}

/** Eyebrow pill above a hero headline: an optional gradient tag, the text, and an arrow when it links somewhere. */
export function EyebrowPill({ tag, children, href, className }: { tag?: string; children: React.ReactNode; href?: string; className?: string }) {
  const inner = (
    <>
      {tag ? <span className="mk-pill__tag">{tag}</span> : <span aria-hidden="true" className="ml-1.5 size-1.5 rounded-full bg-primary" />}
      <span className="min-w-0 truncate">{children}</span>
      {href ? <ArrowRight className="size-3.5 shrink-0 opacity-70" aria-hidden="true" /> : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cn("mk-pill", className)}>
        {inner}
      </Link>
    );
  }
  return <p className={cn("mk-pill", className)}>{inner}</p>;
}

/** 40px neutral icon tile (#1f1f25) with a light-grey icon. */
export function IconTile({ icon: Icon, size = "md", solid, className }: { icon: LucideIcon; size?: "sm" | "md" | "lg"; solid?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("mk-tile", size === "lg" && "mk-tile--lg", size === "sm" && "mk-tile--sm", solid && "mk-tile--solid", className)}>
      <Icon className={size === "lg" ? "size-[22px]" : size === "sm" ? "size-4" : "size-5"} />
    </span>
  );
}

/** Marketing CTA link: 44px, radius 10. `primary` indigo with an inner highlight, `secondary` white. */
export function CtaLink({
  href,
  variant = "primary",
  size,
  arrow,
  className,
  children,
  ...rest
}: Omit<React.ComponentProps<typeof Link>, "href"> & { href: string; variant?: "primary" | "secondary" | "ghost"; size?: "sm" | "lg"; arrow?: boolean }) {
  return (
    <Link
      href={href}
      data-btn=""
      className={cn("mk-btn group/cta", `mk-btn--${variant}`, size === "sm" && "mk-btn--sm", size === "lg" && "mk-btn--lg", className)}
      {...rest}
    >
      {children}
      {arrow ? <ArrowRight className="size-4 transition-transform duration-300 ease-snap group-hover/cta:translate-x-0.5" aria-hidden="true" /> : null}
    </Link>
  );
}

/**
 * Browser window around a product screenshot: dark chrome, three dots, a URL pill, and (with
 * `glow`) a faint monochrome wash behind it. The chrome is decorative; describe the content yourself.
 */
export function BrowserWindow({ url, children, glow = true, className, bodyClassName }: { url: string; children: React.ReactNode; glow?: boolean | "sm"; className?: string; bodyClassName?: string }) {
  return (
    <div className={cn(glow && "mk-glow", glow === "sm" && "mk-glow--sm", className)}>
      <div className="mk-browser">
        <div aria-hidden="true" className="mk-browser__bar">
          <span className="mk-browser__dots">
            <span />
            <span />
            <span />
          </span>
          <span className="mk-browser__url">{url}</span>
          <span className="w-[46px]" />
        </div>
        <div className={cn("relative bg-card", bodyClassName)}>{children}</div>
      </div>
    </div>
  );
}

/** Section kicker: a small grey square plus a short grey label, used above section headings. */
export function Kicker({ children, className, center }: { children: React.ReactNode; className?: string; center?: boolean }) {
  return (
    <p className={cn("flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground", (center || className?.includes("justify-center")) && "justify-center", className)}>
      <span aria-hidden="true" className="inline-block size-2 rounded-[3px] bg-border-strong" />
      {children}
    </p>
  );
}
