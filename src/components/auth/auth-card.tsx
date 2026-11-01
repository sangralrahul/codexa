import { cn } from "@/lib/utils";

/**
 * The account pages' card (the layout provides the top bar, wall and footer).
 *
 * A solid panel with a hairline edge and crosshair corners: the page's h1 (`title`), a one-line
 * `description`, then the form. Forms may end with an `.auth-panel__foot` band (the switch line),
 * which bleeds to the card's edges.
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
  /** Small block above the title (e.g. the workspace on an invitation). */
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby="auth-title" className={cn("auth-panel auth-rise", className)}>
      <span aria-hidden="true" className="auth-cross" data-pos="tl" />
      <span aria-hidden="true" className="auth-cross" data-pos="tr" />
      <span aria-hidden="true" className="auth-cross" data-pos="bl" />
      <span aria-hidden="true" className="auth-cross" data-pos="br" />
      <div className="auth-panel__body [--rise-base:60ms]">
        {eyebrow ? <div className="mb-6">{eyebrow}</div> : null}
        <h1 id="auth-title" className="text-balance text-2xl font-semibold leading-8 tracking-[-0.025em] text-foreground">
          {title}
        </h1>
        {description ? <div className="mt-2 text-pretty text-sm leading-6 text-muted-foreground">{description}</div> : null}
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}
