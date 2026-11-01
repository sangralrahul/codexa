import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

/**
 * Heading block and form panel for the account pages (the layout provides the wall and frame).
 *
 * - `headline` (sign in, sign up): a two-line h1, the second line muted; `title` then names
 *   the panel (h2, mono uppercase) so the form keeps an accessible heading.
 * - otherwise `title` is the page's h1 and `label` (optional) names the panel.
 *
 * The panel is a solid card with a hairline edge, crosshair corners and construction lines.
 */
export function AuthCard({
  title,
  headline,
  label,
  description,
  eyebrow,
  children,
  className,
}: {
  title: string;
  /** Two lines for the hero h1; the second is muted. */
  headline?: readonly [string, string];
  /** Panel label when there is no headline (mono, uppercase). */
  label?: string;
  description?: React.ReactNode;
  /** Small block at the top of the panel (e.g. the workspace on an invitation). */
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const panelLabel = headline ? title : label;
  return (
    <div className={cn("auth-rise flex flex-col items-center", className)}>
      <span aria-hidden="true" className="flex size-11 items-center justify-center border border-border-strong bg-card">
        <LogoMark size={22} />
      </span>
      <h1
        className={cn(
          "mt-6 text-balance text-center font-sans font-semibold text-foreground",
          headline ? "text-[32px] leading-[1.05] tracking-[-0.04em] sm:text-[44px]" : "text-[28px] leading-[1.1] tracking-[-0.035em] sm:text-[32px]",
        )}
      >
        {headline ? (
          <>
            <span className="block">{headline[0]}</span>
            <span className="block text-muted-foreground">{headline[1]}</span>
          </>
        ) : (
          title
        )}
      </h1>
      {description ? (
        <div className="mt-3 max-w-[30rem] text-balance text-center text-[15px] leading-relaxed text-muted-foreground [&_.flex]:justify-center">{description}</div>
      ) : null}
      <section aria-labelledby={panelLabel ? "auth-panel-label" : undefined} className="auth-panel mt-8 w-full sm:mt-10">
        <span aria-hidden="true" className="auth-cross" data-pos="tl" />
        <span aria-hidden="true" className="auth-cross" data-pos="tr" />
        <span aria-hidden="true" className="auth-cross" data-pos="bl" />
        <span aria-hidden="true" className="auth-cross" data-pos="br" />
        {panelLabel ? (
          <div className="flex h-11 items-center gap-2.5 border-b border-border px-5 sm:px-7">
            <span aria-hidden="true" className="size-1.5 bg-foreground" />
            <h2 id="auth-panel-label" className="truncate font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {panelLabel}
            </h2>
          </div>
        ) : null}
        <div className="p-5 [--rise-base:80ms] sm:p-7">
          {eyebrow ? <div className="mb-6">{eyebrow}</div> : null}
          {children}
        </div>
      </section>
    </div>
  );
}
