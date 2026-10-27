import type * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Two token colours per blog area; the cover is a pure-CSS gradient built from them. */
const AREA_TONES: Record<string, [string, string]> = {
  Engineering: ["var(--accent)", "var(--info)"],
  Practice: ["var(--success)", "var(--syn-attr)"],
  Product: ["var(--signal)", "var(--warning)"],
};
const FALLBACK: [string, string] = ["var(--signal)", "var(--accent)"];

export function areaTones(category: string): [string, string] {
  return AREA_TONES[category] ?? FALLBACK;
}

/**
 * Typographic cover for a blog post: the title set in display type over the area's gradient.
 * Pure CSS (no image). With `link`, the cover's title is the card's real heading, and its link is
 * stretched over the nearest positioned ancestor (the card). The layers are stacked with one grid
 * cell instead of absolute positioning so the cover itself is not that ancestor.
 */
export function BlogCover({
  title,
  category,
  size = "md",
  link,
  label = "Codexa · Blog",
  className,
}: {
  title: string;
  category: string;
  size?: "lg" | "md";
  /** Mono label in the top-right corner. */
  label?: string;
  link?: { href: string; level: 2 | 3 };
  className?: string;
}) {
  const [a, b] = areaTones(category);
  const style = {
    "--tone-a": a,
    "--tone-b": b,
    backgroundImage:
      "radial-gradient(120% 95% at 0% 0%, color-mix(in oklab, var(--tone-a) 42%, transparent), transparent 62%), radial-gradient(90% 90% at 100% 100%, color-mix(in oklab, var(--tone-b) 34%, transparent), transparent 66%)",
  } as React.CSSProperties;
  const titleClass = cn(
    "font-display z-[1] self-end px-5 pb-5 font-bold text-foreground [grid-area:1/1] sm:px-6 sm:pb-6",
    size === "lg" ? "max-w-[18ch] text-[clamp(28px,4.2vw,52px)] leading-[0.98] tracking-[-0.025em]" : "max-w-[20ch] text-[24px] leading-[1.02] tracking-[-0.035em]",
  );
  const text = <span className="inline-block transition-transform duration-(--dur-4) ease-(--ease-out) group-hover:-translate-y-1 calm:group-hover:translate-y-0">{title}</span>;
  const Tag = link?.level === 2 ? "h2" : "h3";
  return (
    <div style={style} className={cn("grid overflow-hidden bg-surface", className)}>
      <div aria-hidden="true" className="bg-dots opacity-50 [grid-area:1/1] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
      <div aria-hidden="true" className="flex items-center justify-between self-start px-5 pt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground/60 [grid-area:1/1] sm:px-6">
        <span>{category}</span>
        <span>{label}</span>
      </div>
      {link ? (
        <Tag className={titleClass}>
          <Link href={link.href} className="outline-none after:absolute after:inset-0 after:z-[2] after:rounded-[22px] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring">
            {text}
          </Link>
        </Tag>
      ) : (
        <p aria-hidden="true" className={titleClass}>
          {text}
        </p>
      )}
    </div>
  );
}

/**
 * Article header for a blog post: the post's real h1 set in display type over the same area
 * gradient as its index cover, so the card and the article read as one object. Pure CSS.
 */
export function BlogHero({ title, category, label = "Codexa · Blog", className, children }: { title: string; category: string; label?: string; className?: string; children?: React.ReactNode }) {
  const [a, b] = areaTones(category);
  const style = {
    "--tone-a": a,
    "--tone-b": b,
    backgroundImage:
      "radial-gradient(120% 95% at 0% 0%, color-mix(in oklab, var(--tone-a) 42%, transparent), transparent 62%), radial-gradient(90% 90% at 100% 100%, color-mix(in oklab, var(--tone-b) 34%, transparent), transparent 66%)",
  } as React.CSSProperties;
  return (
    <div style={style} className={cn("relative isolate overflow-hidden rounded-[24px] border border-border bg-surface", className)}>
      <div aria-hidden="true" className="bg-dots absolute inset-0 -z-10 opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
      <div className="flex items-center justify-between px-6 pt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground/60 sm:px-10">
        <span>{category}</span>
        <span aria-hidden="true">{label}</span>
      </div>
      <h1 className="font-display max-w-[20ch] px-6 pb-8 pt-20 text-[clamp(34px,5.2vw,60px)] font-bold leading-[0.98] tracking-[-0.025em] text-foreground sm:px-10 sm:pb-10 sm:pt-28">{title}</h1>
      {children ? <div className="-mt-4 px-6 pb-8 sm:-mt-6 sm:px-10 sm:pb-10">{children}</div> : null}
    </div>
  );
}
