import { cn } from "@/lib/utils";

/**
 * Heading block and content for the account pages (the layout provides the frame).
 * Renders the page's only h1, a short muted lede and the page body.
 */
export function AuthCard({
  title,
  description,
  eyebrow,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  /** Small block above the heading (e.g. the workspace on an invitation). */
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("auth-rise", className)}>
      {eyebrow ? <div className="mb-6">{eyebrow}</div> : null}
      <h1 className="text-display-4 text-balance text-foreground">{title}</h1>
      {description ? <div className="mt-2 text-balance text-[15px] leading-relaxed text-muted-foreground">{description}</div> : null}
      <div className="mt-8 [--rise-base:80ms]">{children}</div>
    </div>
  );
}
