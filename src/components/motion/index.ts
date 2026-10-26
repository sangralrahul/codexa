/**
 * Motion kit (PLAN §3). SplitHeading is a server component; everything else is client.
 * Rules: animate transform / opacity / clip-path; respect calm (useCalm / `calm:`);
 * loops stop off-screen; every >5s autoplay gets a PauseButton. See docs/DESIGN.md.
 */
export { SplitHeading } from "./split-heading";
export { ScrollScene, useScene, scrollToStep } from "./scroll-scene";
export { useAutoplay, PauseButton } from "./autoplay";
export { useTimeline, useTypewriter } from "./timeline";
export { Odometer } from "./odometer";
export { useGlide, GlideIndicator } from "./glide";
export { LaunchSequence, useLaunch, type LaunchStep } from "./launch";
export { MotionToggle } from "./motion-toggle";
