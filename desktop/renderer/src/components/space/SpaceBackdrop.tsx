import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Repeat } from "lucide-react";
import { useCalm } from "../../lib/motion";
import { cn } from "../../lib/util";
import { ALL_SCENES, isSpaceSceneId, sceneFor, scenesFor, type DarkSceneId, type SpaceSceneId, type SpaceTheme } from "./scenes";
import { Starfield } from "./Starfield";
import { Dustfield } from "./Dustfield";

/* ---- The app theme, live: the `.dark` class on <html> (set by app/theme.ts and Settings > App) ---- */

function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}
const readTheme = (): SpaceTheme => (document.documentElement.classList.contains("dark") ? "dark" : "light");

/** The resolved app theme; re-renders when it changes (including "follow Windows" flips). */
export function useSpaceTheme(): SpaceTheme {
  return useSyncExternalStore(subscribeTheme, readTheme, () => "dark");
}

/* ---- The pinned scene per theme (localStorage, with an in-memory fallback when storage is blocked) ---- */

const KEYS: Record<SpaceTheme, string> = { dark: "codexa:space-scene", light: "codexa:space-scene:light" };
const EVENT = "codexa:space-scene";
const memory: Record<SpaceTheme, SpaceSceneId | null> = { dark: null, light: null };

function readPinned(theme: SpaceTheme): SpaceSceneId | null {
  try {
    const v = window.localStorage.getItem(KEYS[theme]);
    return isSpaceSceneId(v, theme) ? v : null;
  } catch {
    return memory[theme];
  }
}

/** Pin a scene for a theme (stops the rotation), or null to go back to cycling. */
export function pinSpaceScene(id: SpaceSceneId | null, theme: SpaceTheme = "dark") {
  memory[theme] = id;
  try {
    if (id) window.localStorage.setItem(KEYS[theme], id);
    else window.localStorage.removeItem(KEYS[theme]);
  } catch {
    /* storage blocked: the in-memory value still applies for this session */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribePinned(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** True while `ref` is on screen (inside its scroll container) and the window is visible. */
function useOnScreen(ref: React.RefObject<HTMLElement | null>) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let inView = false;
    const sync = () => setOn(inView && document.visibilityState === "visible");
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ref]);
  return on;
}

/**
 * The live backdrop behind Home's hero and the screen banners (a port of the web dashboard's
 * SpaceBackdrop): the scene image with a slow Ken Burns drift, crossfading to the next scene every
 * `interval` ms unless one is pinned, a canvas on top (stars in the dark theme, drifting dust and glints
 * in the light theme), the optional parallax mist veil, the legibility scrims, and a small scene picker.
 *
 * The scene set follows the app theme live (night scenes in dark, daylight scenes in light) and the pin
 * is remembered per theme. With `scene` set (banners) the backdrop shows that scene (or its daylight
 * pair) and neither rotates nor offers the picker.
 *
 * Calm (Windows "show animations" off, or Settings > App > Motion): the image only, no canvas, no
 * drift, no veil movement, no rotation. Scrolled away or with the window hidden, everything pauses.
 */
export function SpaceBackdrop({
  interval = 25_000,
  scene: fixed,
  variant = "hero",
  className,
}: {
  interval?: number;
  /** Show this scene (its daylight pair in the light theme) instead of rotating; hides the picker. */
  scene?: DarkSceneId;
  /** "banner" uses each scene's short-crop focus and a quieter canvas. */
  variant?: "hero" | "banner";
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const calm = useCalm();
  const theme = useSpaceTheme();
  const scenes = scenesFor(theme);
  const storedPin = useSyncExternalStore(
    subscribePinned,
    () => readPinned(theme),
    () => null,
  );
  const pinned = fixed ? null : storedPin;
  const active = useOnScreen(rootRef);
  const [auto, setAuto] = useState(0);
  const current: SpaceSceneId = fixed ? sceneFor(theme, fixed).id : (pinned ?? scenes[auto % scenes.length].id);
  const banner = variant === "banner";
  const motion = ALL_SCENES.find((s) => s.id === current)?.motion;

  // Image layers, newest last: the previous scene stays underneath while the new one fades in.
  const [shown, setShown] = useState<SpaceSceneId | null>(null);
  const [layers, setLayers] = useState<SpaceSceneId[]>([]);
  const [loaded, setLoaded] = useState<ReadonlySet<SpaceSceneId>>(() => new Set());
  if (current !== shown) {
    setShown(current);
    setLayers((l) => [...l.filter((x) => x !== current).slice(-1), current]);
  }

  useEffect(() => {
    if (fixed || calm || pinned || !active) return;
    const t = window.setTimeout(() => setAuto((i) => (i + 1) % scenes.length), interval);
    return () => window.clearTimeout(t);
  }, [fixed, calm, pinned, active, auto, interval, scenes.length]);

  const markLoaded = (id: SpaceSceneId) => {
    // Two frames later, so the opacity transition starts from a painted 0.
    requestAnimationFrame(() => requestAnimationFrame(() => setLoaded((s) => (s.has(id) ? s : new Set(s).add(id)))));
  };
  const top = layers[layers.length - 1];

  return (
    <div ref={rootRef} className={cn("space-backdrop", className)} data-variant={variant} data-paused={!active || undefined} data-calm={calm || undefined}>
      <div className="space-backdrop__scenes" aria-hidden="true">
        {layers.map((id) => {
          const scene = ALL_SCENES.find((s) => s.id === id)!;
          const isTop = id === top;
          return (
            <div
              key={id}
              className="space-backdrop__layer"
              data-top={isTop || undefined}
              data-loaded={loaded.has(id) || undefined}
              onTransitionEnd={(e) => {
                if (!isTop || e.propertyName !== "opacity" || e.target !== e.currentTarget) return;
                // The new scene is fully in: drop the one underneath.
                setLayers([id]);
                setLoaded(new Set([id]));
              }}
            >
              <div className="space-backdrop__drift" style={{ "--drift-x": `${scene.drift.x}%`, "--drift-y": `${scene.drift.y}%` } as React.CSSProperties}>
                <img
                  src={scene.src}
                  alt=""
                  width={2400}
                  height={1100}
                  decoding="async"
                  draggable={false}
                  style={{ objectPosition: banner ? scene.band : scene.focus }}
                  ref={(el) => {
                    if (el?.complete && el.naturalWidth) markLoaded(id);
                  }}
                  onLoad={() => markLoaded(id)}
                />
                {scene.veil ? (
                  <div className="space-veil" style={{ "--veil": `url(${scene.veil})` } as React.CSSProperties}>
                    <div className="space-veil__track space-veil__track--far" />
                    <div className="space-veil__track space-veil__track--near" />
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {!calm ? (
        theme === "dark" ? (
          banner ? (
            <Starfield running={active} density={0.5} meteors={false} className="space-backdrop__stars" />
          ) : (
            <Starfield running={active} className="space-backdrop__stars" />
          )
        ) : (
          <Dustfield running={active} density={(motion?.dust ?? 1) * (banner ? 0.6 : 1)} glint={motion ? motion.glint : "light"} className="space-backdrop__stars" />
        )
      ) : null}
      <div className="space-backdrop__scrim" aria-hidden="true" />

      {!fixed ? (
        <div role="group" aria-label="Backdrop scene" className="space-picker">
          {scenes.map((s) => (
            <button key={s.id} type="button" aria-pressed={current === s.id} onClick={() => pinSpaceScene(s.id, theme)} className="space-picker__btn" title={`Show the ${s.label.toLowerCase()} scene`}>
              <span className="space-picker__dot" aria-hidden="true" />
              {s.label}
            </button>
          ))}
          {!calm ? (
            <button
              type="button"
              aria-pressed={!pinned}
              onClick={() => {
                setAuto(Math.max(0, scenes.findIndex((s) => s.id === current)));
                pinSpaceScene(null, theme);
              }}
              className="space-picker__btn space-picker__btn--icon"
              title={`Cycle through the scenes every ${Math.round(interval / 1000)} seconds`}
            >
              <Repeat className="size-3" aria-hidden="true" />
              <span className="sr-only">Cycle scenes</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
