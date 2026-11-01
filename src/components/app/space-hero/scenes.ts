/**
 * The dashboard hero's backdrops. Every image is generated procedurally by
 * `scripts/generate-space-art.mjs` (no photos, no external hosts) into `public/space/`.
 *
 * `focus` is the image's point of interest (object-position), so narrow screens that only show a
 * slice of the 2400x1100 frame keep the planet, moon, nebula or galaxy in view. `drift` is the
 * direction of the slow Ken Burns pan, in percent of the frame.
 */
export type SpaceSceneId = "orbit" | "moon" | "nebula" | "galaxy";

export type SpaceScene = { id: SpaceSceneId; label: string; src: string; focus: string; drift: { x: number; y: number } };

export const SPACE_SCENES: readonly SpaceScene[] = [
  { id: "orbit", label: "Orbit", src: "/space/orbit.webp", focus: "62% 70%", drift: { x: -1.6, y: -0.8 } },
  { id: "moon", label: "Moon", src: "/space/moon.webp", focus: "80% 48%", drift: { x: -1.2, y: 0.9 } },
  { id: "nebula", label: "Nebula", src: "/space/nebula.webp", focus: "68% 50%", drift: { x: 1.4, y: -1 } },
  { id: "galaxy", label: "Galaxy", src: "/space/galaxy.webp", focus: "78% 46%", drift: { x: -1.4, y: 1 } },
];

export function isSpaceSceneId(v: unknown): v is SpaceSceneId {
  return typeof v === "string" && SPACE_SCENES.some((s) => s.id === v);
}
