import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { cn } from "@/lib/utils";

/** Standard header for index pages: breadcrumbs, eyebrow, h1, lede, optional actions. */
export function PageIntro({
  crumbs,
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  crumbs?: Crumb[];
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("border-b border-border", className)}>
      <div className="container-x py-10 sm:py-14">
        {crumbs ? <Breadcrumbs items={crumbs} className="mb-4" /> : null}
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p> : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">{description}</p> : null}
        {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </header>
  );
}
