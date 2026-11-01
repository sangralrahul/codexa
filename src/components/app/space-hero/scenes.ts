/**
 * The space backdrops (dashboard hero and page banners). Every image is generated procedurally by
 * `scripts/generate-space-art.mjs` (no photos, no external hosts) into `public/space/`.
 *
 * There are two sets: the night set for the dark theme and a daylight set for the light theme. Each dark
 * scene has a light counterpart (`LIGHT_PAIR`), so a page that picks "nebula" shows the cloud deck in
 * light mode.
 *
 * `focus` is the image's point of interest (object-position) for the tall hero crop, so narrow screens
 * that only show a slice of the 2400x1100 frame keep the subject in view; `band` is the same for the
 * short, wide banner crop. `drift` is the direction of the slow Ken Burns pan, in percent of the frame.
 * `motion` tunes the light theme's canvas (dust specks, glints) and the optional drifting cloud `veil`.
 */
export type SpaceTheme = "dark" | "light";
export type DarkSceneId = "orbit" | "moon" | "nebula" | "galaxy";
export type LightSceneId = "daylight" | "clouds" | "lunar" | "chart";
export type SpaceSceneId = DarkSceneId | LightSceneId;

export type SpaceScene = {
  id: SpaceSceneId;
  label: string;
  src: string;
  focus: string;
  band: string;
  drift: { x: number; y: number };
  /** Light theme: dust density multiplier and glint style ("light" = soft white flare, "ink" = a dark star tick). */
  motion?: { dust: number; glint: "light" | "ink" | null };
  /** A tileable alpha layer slid across the scene at two speeds (parallax mist). */
  veil?: string;
};

export const SPACE_SCENES: readonly SpaceScene[] = [
  { id: "orbit", label: "Orbit", src: "/space/orbit.webp", focus: "62% 70%", band: "62% 68%", drift: { x: -1.6, y: -0.8 } },
  { id: "moon", label: "Moon", src: "/space/moon.webp", focus: "80% 48%", band: "80% 46%", drift: { x: -1.2, y: 0.9 } },
  { id: "nebula", label: "Nebula", src: "/space/nebula.webp", focus: "68% 50%", band: "68% 50%", drift: { x: 1.4, y: -1 } },
  { id: "galaxy", label: "Galaxy", src: "/space/galaxy.webp", focus: "78% 46%", band: "78% 44%", drift: { x: -1.4, y: 1 } },
];

export const LIGHT_SPACE_SCENES: readonly SpaceScene[] = [
  { id: "daylight", label: "Daylight", src: "/space/light-daylight.webp", focus: "60% 70%", band: "60% 74%", drift: { x: -1.4, y: -0.7 }, motion: { dust: 1, glint: "light" } },
  {
    id: "clouds",
    label: "Clouds",
    src: "/space/light-clouds.webp",
    focus: "60% 46%",
    band: "60% 36%",
    drift: { x: 1.2, y: -0.6 },
    motion: { dust: 0.6, glint: "light" },
    veil: "/space/light-clouds-veil.webp",
  },
  { id: "lunar", label: "Lunar day", src: "/space/light-lunar.webp", focus: "78% 34%", band: "78% 24%", drift: { x: -1.2, y: 0.8 }, motion: { dust: 1, glint: "light" } },
  { id: "chart", label: "Star chart", src: "/space/light-chart.webp", focus: "66% 50%", band: "66% 50%", drift: { x: -1, y: 0.6 }, motion: { dust: 0.7, glint: "ink" } },
];

/** Each night scene's daylight counterpart. */
export const LIGHT_PAIR: Record<DarkSceneId, LightSceneId> = { orbit: "daylight", moon: "lunar", nebula: "clouds", galaxy: "chart" };

export function scenesFor(theme: SpaceTheme): readonly SpaceScene[] {
  return theme === "light" ? LIGHT_SPACE_SCENES : SPACE_SCENES;
}

/** The scene a page asked for (by its night id) in the given theme. */
export function sceneFor(theme: SpaceTheme, id: DarkSceneId): SpaceScene {
  const want = theme === "light" ? LIGHT_PAIR[id] : id;
  return scenesFor(theme).find((s) => s.id === want)!;
}

export function isSpaceSceneId(v: unknown, theme: SpaceTheme = "dark"): v is SpaceSceneId {
  return typeof v === "string" && scenesFor(theme).some((s) => s.id === v);
}
