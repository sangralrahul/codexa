import orbit from "../../assets/space/orbit.webp";
import moon from "../../assets/space/moon.webp";
import nebula from "../../assets/space/nebula.webp";
import galaxy from "../../assets/space/galaxy.webp";
import daylight from "../../assets/space/light-daylight.webp";
import clouds from "../../assets/space/light-clouds.webp";
import cloudsVeil from "../../assets/space/light-clouds-veil.webp";
import lunar from "../../assets/space/light-lunar.webp";
import chart from "../../assets/space/light-chart.webp";

/**
 * The Home hero's and the page banners' backdrops: the web dashboard's generated space art
 * (public/space, made by scripts/generate-space-art.mjs), bundled with the app so nothing loads from
 * the network. A port of src/components/app/space-hero/scenes.ts.
 *
 * There are two sets: the night set for the dark theme and a daylight set for the light theme. Each dark
 * scene has a light counterpart (`LIGHT_PAIR`), so a screen that picks "nebula" shows the cloud deck in
 * light mode.
 *
 * `focus` is the image's point of interest (object-position) for the tall hero crop; `band` is the same
 * for the short, wide banner crop. `drift` is the direction of the slow Ken Burns pan, in percent of the
 * frame. `motion` tunes the light theme's canvas (dust specks, glints) and the optional drifting `veil`.
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
  { id: "orbit", label: "Orbit", src: orbit, focus: "62% 70%", band: "62% 68%", drift: { x: -1.6, y: -0.8 } },
  { id: "moon", label: "Moon", src: moon, focus: "80% 48%", band: "80% 46%", drift: { x: -1.2, y: 0.9 } },
  { id: "nebula", label: "Nebula", src: nebula, focus: "68% 50%", band: "68% 50%", drift: { x: 1.4, y: -1 } },
  { id: "galaxy", label: "Galaxy", src: galaxy, focus: "78% 46%", band: "78% 44%", drift: { x: -1.4, y: 1 } },
];

export const LIGHT_SPACE_SCENES: readonly SpaceScene[] = [
  { id: "daylight", label: "Daylight", src: daylight, focus: "60% 70%", band: "60% 74%", drift: { x: -1.4, y: -0.7 }, motion: { dust: 1, glint: "light" } },
  { id: "clouds", label: "Clouds", src: clouds, focus: "60% 46%", band: "60% 36%", drift: { x: 1.2, y: -0.6 }, motion: { dust: 0.6, glint: "light" }, veil: cloudsVeil },
  { id: "lunar", label: "Lunar day", src: lunar, focus: "78% 34%", band: "78% 24%", drift: { x: -1.2, y: 0.8 }, motion: { dust: 1, glint: "light" } },
  { id: "chart", label: "Star chart", src: chart, focus: "66% 50%", band: "66% 50%", drift: { x: -1, y: 0.6 }, motion: { dust: 0.7, glint: "ink" } },
];

export const ALL_SCENES: readonly SpaceScene[] = [...SPACE_SCENES, ...LIGHT_SPACE_SCENES];

/** Each night scene's daylight counterpart. */
export const LIGHT_PAIR: Record<DarkSceneId, LightSceneId> = { orbit: "daylight", moon: "lunar", nebula: "clouds", galaxy: "chart" };

export function scenesFor(theme: SpaceTheme): readonly SpaceScene[] {
  return theme === "light" ? LIGHT_SPACE_SCENES : SPACE_SCENES;
}

/** The scene a screen asked for (by its night id) in the given theme. */
export function sceneFor(theme: SpaceTheme, id: DarkSceneId): SpaceScene {
  const want = theme === "light" ? LIGHT_PAIR[id] : id;
  return scenesFor(theme).find((s) => s.id === want)!;
}

export function isSpaceSceneId(v: unknown, theme: SpaceTheme = "dark"): v is SpaceSceneId {
  return typeof v === "string" && scenesFor(theme).some((s) => s.id === v);
}
