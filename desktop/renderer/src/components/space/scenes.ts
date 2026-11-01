import orbit from "../../assets/space/orbit.webp";
import moon from "../../assets/space/moon.webp";
import nebula from "../../assets/space/nebula.webp";
import galaxy from "../../assets/space/galaxy.webp";

/**
 * The Home hero's backdrops: the web dashboard's generated space art (public/space, made by
 * scripts/generate-space-art.mjs), bundled with the app so nothing loads from the network.
 *
 * `focus` is the image's point of interest (object-position); `drift` is the direction of the slow
 * Ken Burns pan, in percent of the frame.
 */
export type SpaceSceneId = "orbit" | "moon" | "nebula" | "galaxy";

export type SpaceScene = { id: SpaceSceneId; label: string; src: string; focus: string; drift: { x: number; y: number } };

export const SPACE_SCENES: readonly SpaceScene[] = [
  { id: "orbit", label: "Orbit", src: orbit, focus: "62% 70%", drift: { x: -1.6, y: -0.8 } },
  { id: "moon", label: "Moon", src: moon, focus: "80% 48%", drift: { x: -1.2, y: 0.9 } },
  { id: "nebula", label: "Nebula", src: nebula, focus: "68% 50%", drift: { x: 1.4, y: -1 } },
  { id: "galaxy", label: "Galaxy", src: galaxy, focus: "78% 46%", drift: { x: -1.4, y: 1 } },
];

export function isSpaceSceneId(v: unknown): v is SpaceSceneId {
  return typeof v === "string" && SPACE_SCENES.some((s) => s.id === v);
}
