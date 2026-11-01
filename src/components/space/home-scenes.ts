/**
 * The marketing home hero's backdrops: a night set (dark theme) and a daylight set (light theme), different
 * in subject from the dashboard's scenes in `scenes.ts`. Every image is generated procedurally by
 * `scripts/generate-space-art.mjs` (`node scripts/generate-space-art.mjs home-<name>`) into `public/space/`.
 *
 * The headline sits centred over the top ~55% of the frame, so every subject sits right of centre or in
 * the lower third. `focus`, `band`, `drift`, `motion` and `veil` mean the same as on `SpaceScene`.
 */
import type { BackdropSceneSet } from "./space-backdrop";
import type { SpaceScene } from "./scenes";

export type HomeDarkSceneId = "home-rings" | "home-eclipse" | "home-aurora" | "home-milkyway";
export type HomeLightSceneId = "home-light-rings" | "home-light-orrery" | "home-light-dawn" | "home-light-eclipse";
export type HomeSceneId = HomeDarkSceneId | HomeLightSceneId;

export type HomeScene = Omit<SpaceScene, "id"> & {
  id: HomeSceneId;
  /** Dark theme: whether the starfield may draw meteors over this scene (default true). */
  meteors?: boolean;
};

export const HOME_DARK_SCENES: readonly HomeScene[] = [
  { id: "home-rings", label: "Ringed giant", src: "/space/home-rings.webp", focus: "75% 62%", band: "74% 60%", drift: { x: -1.2, y: -0.6 } },
  { id: "home-eclipse", label: "Totality", src: "/space/home-eclipse.webp", focus: "75% 50%", band: "75% 50%", drift: { x: -0.8, y: 0.5 }, meteors: false },
  { id: "home-aurora", label: "Aurora", src: "/space/home-aurora.webp", focus: "80% 66%", band: "78% 64%", drift: { x: -1.4, y: -0.7 } },
  { id: "home-milkyway", label: "Milky Way", src: "/space/home-milkyway.webp", focus: "64% 62%", band: "66% 55%", drift: { x: 1.2, y: -0.9 } },
];

export const HOME_LIGHT_SCENES: readonly HomeScene[] = [
  { id: "home-light-rings", label: "Daylight rings", src: "/space/home-light-rings.webp", focus: "77% 36%", band: "77% 30%", drift: { x: -1.2, y: 0.7 }, motion: { dust: 1, glint: "light" } },
  { id: "home-light-orrery", label: "Orrery", src: "/space/home-light-orrery.webp", focus: "72% 58%", band: "70% 56%", drift: { x: -1, y: 0.5 }, motion: { dust: 0.7, glint: "ink" } },
  { id: "home-light-dawn", label: "Dawn", src: "/space/home-light-dawn.webp", focus: "72% 60%", band: "70% 62%", drift: { x: 1.2, y: -0.6 }, motion: { dust: 0.6, glint: "light" } },
  { id: "home-light-eclipse", label: "White eclipse", src: "/space/home-light-eclipse.webp", focus: "77% 43%", band: "77% 40%", drift: { x: -1, y: 0.6 }, motion: { dust: 0.8, glint: null } },
];

/** The home hero's set for `SpaceBackdrop`; pins are kept apart from the dashboard's. */
export const HOME_SCENE_SET: BackdropSceneSet = { key: "home", dark: HOME_DARK_SCENES, light: HOME_LIGHT_SCENES };
