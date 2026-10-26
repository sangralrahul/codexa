import { cn } from "@/lib/utils";

/**
 * Settings group in the Vercel style: a bordered card with a title and one-line
 * description, the fields, and an optional footer bar (hint on the left,
 * action on the right). Put a <form> around it when the footer holds the submit button.
 */
export function SettingsCard({
  title,
  description,
  children,
  footer,
  hint,
  tone = "default",
  id,
  className,
  bodyClassName,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Right side of the footer bar: usually the save button. */
  footer?: React.ReactNode;
  /** Left side of the footer bar. */
  hint?: React.ReactNode;
  tone?: "default" | "danger";
  id?: string;
  className?: string;
  bodyClassName?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn("overflow-hidden rounded-xl border bg-card text-card-foreground", tone === "danger" ? "border-danger/30" : "border-border", className)}>
      <header className={cn("px-6 pt-5", tone === "danger" && "border-b border-danger/20 bg-danger/[0.04] pb-4")}>
        <h2 id={headingId} className={cn("text-base font-semibold tracking-tight", tone === "danger" && "text-danger")}>
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </header>
      {children ? <div className={cn("px-6 pb-6 pt-5", bodyClassName)}>{children}</div> : <div className="pb-5" />}
      {footer || hint ? (
        <div className={cn("flex flex-wrap items-center justify-between gap-3 border-t px-6 py-3", tone === "danger" ? "border-danger/20 bg-danger/[0.04]" : "border-border bg-surface/60")}>
          <div className="min-w-0 text-xs text-muted-foreground">{hint}</div>
          {footer ? <div className="flex shrink-0 items-center gap-2">{footer}</div> : null}
        </div>
      ) : null}
    </section>
  );
}

/** Table header cell and row styling shared by settings lists. */
export const tableHead = "px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";
export const tableRow = "border-t border-border transition-colors hover:bg-muted/40";
