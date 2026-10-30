import { cn } from "@/lib/utils";

/**
 * Settings section card (server-safe). A glassy e1 surface with an inset highlight that
 * lifts its border on hover and staggers in (50ms per card, see settings.css):
 * - header: optional `icon` tile, title (h2, `${id}-title`) and description, `actions` on the right;
 * - body: the controls; `layout="split"` puts the header in a 1/3 column beside them at lg (Stripe/Linear);
 * - footer bar: `hint` on the left (put role=status success text here), `footer` on the right.
 * `id` is the section anchor (#plan, #members …) and labels the section (aria-labelledby).
 * Put a <form> around it when the footer holds the submit button.
 */
export function SettingsCard({
  title,
  description,
  children,
  footer,
  hint,
  tone = "default",
  id,
  icon,
  actions,
  layout = "stack",
  dirty = false,
  flush = false,
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
  /** Small icon shown in a tile before the title. */
  icon?: React.ReactNode;
  /** Header actions (buttons, links, a badge) aligned to the right of the title. */
  actions?: React.ReactNode;
  /** "split": title and description in a left column, controls on the right (lg and up). */
  layout?: "stack" | "split";
  /** Tints the footer bar while a form inside has unsaved changes. */
  dirty?: boolean;
  /** Edge-to-edge body for row lists and tables (rows bring their own padding): no side or bottom padding. */
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  const danger = tone === "danger";
  const split = layout === "split";
  const body = flush ? "pt-3" : "px-5 pb-6 pt-5 sm:px-6";
  const header = (
    <header className={cn("flex items-start gap-3.5 px-5 pt-5 sm:px-6", danger && !split && "bg-danger/[0.035] pb-4", danger && !split && children && "border-b border-danger/15", split && "lg:px-6 lg:pb-6")}>
      {icon ? (
        <span
          aria-hidden="true"
          className={cn(
            "mt-px flex size-9 shrink-0 items-center justify-center rounded-md [&_svg]:size-[18px]",
            danger ? "bg-danger/10 text-danger shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--danger)_22%,transparent)]" : "icon-tile",
          )}
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h2 id={headingId} className={cn("min-w-0 text-[15px] font-semibold leading-6 tracking-[-0.01em]", danger && "text-danger")}>
            {title}
          </h2>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {description ? <p className="mt-1 max-w-prose text-pretty text-[13px] leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
    </header>
  );
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-tone={danger ? "danger" : undefined}
      className={cn("settings-card overflow-hidden rounded-lg text-card-foreground", className)}
    >
      {split ? (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          {header}
          {children ? <div className={cn(body, "lg:border-l lg:border-border/70 lg:pt-6", bodyClassName)}>{children}</div> : <div className="pb-5" />}
        </div>
      ) : (
        <>
          {header}
          {children ? <div className={cn(body, bodyClassName)}>{children}</div> : danger ? null : <div className="pb-5" />}
        </>
      )}
      {footer || hint ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 transition-colors duration-200 sm:px-6",
            danger ? "border-danger/15 bg-danger/[0.035]" : dirty ? "border-primary/25 bg-primary/[0.05]" : "border-border/80 bg-surface/50",
          )}
        >
          <div className="min-w-0 flex-1 text-xs text-muted-foreground">{hint}</div>
          {footer ? <div className="flex shrink-0 items-center gap-2">{footer}</div> : null}
        </div>
      ) : null}
    </section>
  );
}

/** Table header cell and row styling shared by settings lists. Rows get a 2px signal accent on hover / focus. */
export const tableHead = "px-4 py-2.5 text-left text-xs font-medium text-muted-foreground";
export const tableRow = "settings-row border-t border-border/80 transition-colors hover:bg-muted/40";
