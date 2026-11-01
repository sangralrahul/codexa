import { cn } from "@/lib/utils";
import { SpaceBackdrop } from "./space-backdrop";
import type { DarkSceneId } from "./scenes";

/**
 * A compact page header on a live scene (the dashboard hero's art, quieter): full bleed, about 168px
 * tall, the page title and an optional subtitle on the left and an `actions` slot on the right, aligned
 * to the app's 1296px content column. The scene follows the theme (night set in dark, its daylight pair
 * in light), so `scene` names the night scene. The title is the page's <h1> unless `titleAs` says
 * otherwise (layouts whose pages render their own <h1>).
 */
export function SpaceBanner({
  title,
  subtitle,
  actions,
  scene = "nebula",
  titleAs: Title = "h1",
  eyebrow,
  className,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  scene?: DarkSceneId;
  titleAs?: "h1" | "h2" | "p";
  /** A small mono label above the title. */
  eyebrow?: React.ReactNode;
  className?: string;
  /** Extra content under the subtitle (e.g. a facts strip). */
  children?: React.ReactNode;
}) {
  return (
    <section data-space-host className={cn("space-banner", className)}>
      <SpaceBackdrop scene={scene} variant="banner" />
      <div className="space-banner__content">
        <div className="min-w-0">
          {eyebrow ? <p className="space-banner__eyebrow">{eyebrow}</p> : null}
          <Title className="space-banner__title">{title}</Title>
          {subtitle ? <p className="space-banner__subtitle">{subtitle}</p> : null}
          {children}
        </div>
        {actions ? <div className="space-banner__actions">{actions}</div> : null}
      </div>
    </section>
  );
}
