import type { ReactNode } from "react";
import { cn } from "../../lib/util";
import { SpaceBackdrop } from "./SpaceBackdrop";
import type { DarkSceneId } from "./scenes";

/**
 * A compact screen header on a live scene (a port of the web's SpaceBanner; Home's hero art, quieter):
 * full width, about 172px tall, the title and an optional subtitle on the left and an `actions` slot on
 * the right, aligned to the screen's content column (`width`). The scene follows the app theme (night
 * set in dark, its daylight pair in light), so `scene` names the night scene. The title is the screen's
 * <h1> unless `titleAs` says otherwise.
 */
export function SpaceBanner({
  title,
  subtitle,
  actions,
  scene = "nebula",
  titleAs: Title = "h1",
  eyebrow,
  width = 1240,
  className,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  scene?: DarkSceneId;
  titleAs?: "h1" | "h2" | "p";
  /** A small mono label above the title. */
  eyebrow?: ReactNode;
  /** The max width of the screen's content column, so the copy lines up with the content below. */
  width?: number;
  className?: string;
  /** Extra content under the subtitle (e.g. tabs). */
  children?: ReactNode;
}) {
  return (
    <section data-space-host className={cn("space-banner", className)}>
      <SpaceBackdrop scene={scene} variant="banner" />
      <div className="space-banner__content" style={{ maxWidth: width }}>
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
