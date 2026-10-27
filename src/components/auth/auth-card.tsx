import { Highlight } from "@/components/marketing/backdrop";
import { cn } from "@/lib/utils";

/**
 * Heading block and content for the account pages (the layout provides the frame).
 * The accent is explicit: `highlight` names the words set in the two-tone dim
 * ("Welcome back." → "back."); nothing is highlighted automatically.
 * Renders the page's only h1. The heading, the lede and the body rise in turn.
 */
export function AuthCard({
  title,
  highlight,
  description,
  eyebrow,
  children,
  className,
}: {
  title: string;
  highlight?: string;
  description?: React.ReactNode;
  /** Small mono line above the heading (e.g. "Invitation"). */
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("auth-rise", className)}>
      {eyebrow ? <div className="mb-5">{eyebrow}</div> : null}
      <h1 className="text-display-3 lg:text-display-2 auth-title text-balance text-foreground">
        <Highlight text={title} highlight={highlight} />
      </h1>
      {description ? <div className="mt-4 text-pretty text-[15px] leading-relaxed text-muted-foreground">{description}</div> : null}
      <div className="mt-8 [--rise-base:120ms]">{children}</div>
    </div>
  );
}
