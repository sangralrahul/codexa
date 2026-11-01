import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Repeat } from "lucide-react";
import { useCalm } from "../../lib/motion";
import { cn } from "../../lib/util";
import { isSpaceSceneId, SPACE_SCENES, type SpaceSceneId } from "./scenes";
import { Starfield } from "./Starfield";

/* ---- The pinned scene (localStorage, with an in-memory fallback when storage is blocked) ---- */

const KEY = "codexa:space-scene";
const EVENT = "codexa:space-scene";
let memory: SpaceSceneId | null = null;

function readPinned(): SpaceSceneId | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return isSpaceSceneId(v) ? v : null;
  } catch {
    return memory;
  }
}

/** Pin a scene (stops the rotation), or null to go back to cycling. */
export function pinSpaceScene(id: SpaceSceneId | null) {
  memory = id;
  try {
    if (id) window.localStorage.setItem(KEY, id);
    else window.localStorage.removeItem(KEY);
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
 * The Home hero's live backdrop (a port of the web dashboard's SpaceBackdrop): the scene image with a
 * slow Ken Burns drift, crossfading to the next scene every `interval` ms unless one is pinned, a
 * canvas starfield on top, the legibility scrims and the fade into the page, and a small scene picker.
 *
 * Calm (Windows "show animations" off, or Settings > App > Motion): the image only, no canvas, no
 * drift, no rotation. Scrolled away or with the window hidden, everything pauses.
 */
export function SpaceBackdrop({ interval = 25_000, className }: { interval?: number; className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const calm = useCalm();
  const pinned = useSyncExternalStore(subscribePinned, readPinned, () => null);
  const active = useOnScreen(rootRef);
  const [auto, setAuto] = useState(0);
  const current: SpaceSceneId = pinned ?? SPACE_SCENES[auto % SPACE_SCENES.length].id;

  // Image layers, newest last: the previous scene stays underneath while the new one fades in.
  const [shown, setShown] = useState<SpaceSceneId | null>(null);
  const [layers, setLayers] = useState<SpaceSceneId[]>([]);
  const [loaded, setLoaded] = useState<ReadonlySet<SpaceSceneId>>(() => new Set());
  if (current !== shown) {
    setShown(current);
    setLayers((l) => [...l.filter((x) => x !== current).slice(-1), current]);
  }

  useEffect(() => {
    if (calm || pinned || !active) return;
    const t = window.setTimeout(() => setAuto((i) => (i + 1) % SPACE_SCENES.length), interval);
    return () => window.clearTimeout(t);
  }, [calm, pinned, active, auto, interval]);

  const markLoaded = (id: SpaceSceneId) => {
    // Two frames later, so the opacity transition starts from a painted 0.
    requestAnimationFrame(() => requestAnimationFrame(() => setLoaded((s) => (s.has(id) ? s : new Set(s).add(id)))));
  };
  const top = layers[layers.length - 1];

  return (
    <div ref={rootRef} className={cn("space-backdrop", className)} data-paused={!active || undefined} data-calm={calm || undefined}>
      <div className="space-backdrop__scenes" aria-hidden="true">
        {layers.map((id) => {
          const scene = SPACE_SCENES.find((s) => s.id === id)!;
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
                  style={{ objectPosition: scene.focus }}
                  ref={(el) => {
                    if (el?.complete && el.naturalWidth) markLoaded(id);
                  }}
                  onLoad={() => markLoaded(id)}
                />
              </div>
            </div>
          );
        })}
      </div>
      {!calm ? <Starfield running={active} className="space-backdrop__stars" /> : null}
      <div className="space-backdrop__scrim" aria-hidden="true" />

      <div role="group" aria-label="Backdrop scene" className="space-picker">
        {SPACE_SCENES.map((s) => (
          <button key={s.id} type="button" aria-pressed={current === s.id} onClick={() => pinSpaceScene(s.id)} className="space-picker__btn" title={`Show the ${s.label.toLowerCase()} scene`}>
            <span className="space-picker__dot" aria-hidden="true" />
            {s.label}
          </button>
        ))}
        {!calm ? (
          <button
            type="button"
            aria-pressed={!pinned}
            onClick={() => {
              setAuto(SPACE_SCENES.findIndex((s) => s.id === current));
              pinSpaceScene(null);
            }}
            className="space-picker__btn space-picker__btn--icon"
            title={`Cycle through the scenes every ${Math.round(interval / 1000)} seconds`}
          >
            <Repeat className="size-3" aria-hidden="true" />
            <span className="sr-only">Cycle scenes</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
