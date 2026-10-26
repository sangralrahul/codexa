"use client";

import * as React from "react";
import { PauseButton, useAutoplay } from "@/components/motion/autoplay";
import { cn } from "@/lib/utils";

type Node = { id: string; x: number; y: number; w: number; title: string; sub: string; href: string; tone?: "edge" | "core" | "data" };

const H = 64;
const NODES: Node[] = [
  { id: "browser", x: 20, y: 200, w: 170, title: "Browser", sub: "session cookie", href: "#accounts", tone: "edge" },
  { id: "worker", x: 280, y: 200, w: 190, title: "Codexa Worker", sub: "auth · roles · limits", href: "#rate-limiting", tone: "core" },
  { id: "sandbox", x: 560, y: 200, w: 190, title: "ProjectSandbox DO", sub: "one per project", href: "#sandboxing", tone: "core" },
  { id: "container", x: 810, y: 200, w: 170, title: "Container runner", sub: "unprivileged user", href: "#sandboxing", tone: "core" },
  { id: "preview", x: 280, y: 52, w: 190, title: "Preview origin", sub: "<token>.preview host", href: "#sandboxing", tone: "edge" },
  { id: "encrypt", x: 280, y: 348, w: 190, title: "encryptSecret()", sub: "AES-256-GCM", href: "#secrets", tone: "data" },
  { id: "d1", x: 560, y: 348, w: 190, title: "Cloudflare D1", sub: "ciphertext only", href: "#secrets", tone: "data" },
];

const PATHS = {
  main: "M190 232 H810",
  preview: "M150 200 C150 120 200 84 280 84 H470 C600 84 655 120 655 200",
  secrets: "M375 264 V380 H560",
};

const RAIL = ["browser", "worker", "sandbox", "container"].map((id) => NODES.find((n) => n.id === id)!);
const LANES = [
  { label: "Previews", node: NODES.find((n) => n.id === "preview")!, note: "<token>.preview host, a separate origin" },
  { label: "Secrets", node: NODES.find((n) => n.id === "d1")!, note: "encryptSecret() first; ciphertext only" },
];

/** Phones: the main path as a vertical rail with one packet (CSS, container units), lanes listed under it. */
function PhoneRail({ running, started }: { running: boolean; started: boolean }) {
  return (
    <div className="relative p-4 pb-14 md:hidden">
      <ol aria-label="Request path through Codexa" className="relative space-y-3">
        <span aria-hidden="true" className="absolute bottom-8 left-[21px] top-8 w-px bg-border-strong" />
        <span aria-hidden="true" className="mk-rail calm:hidden" data-started={started ? "" : undefined} data-running={running ? "" : undefined}>
          <span className="mk-rail__packet" />
        </span>
        {RAIL.map((n, i) => (
          <li key={n.id} className="relative">
            <a href={n.href} className="flex items-center gap-3 rounded-[14px] border border-border bg-card px-3 py-3 transition-colors hover:border-border-strong">
              <span aria-hidden="true" className="relative z-[1] inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border border-border-strong bg-background font-mono text-[9.5px] text-muted-foreground">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold">{n.title}</span>
                <span className="block font-mono text-[11px] text-muted-foreground">{n.sub}</span>
              </span>
            </a>
          </li>
        ))}
      </ol>
      <ul className="mt-4 grid gap-2">
        {LANES.map((l) => (
          <li key={l.label}>
            <a href={l.node.href} className="flex items-start gap-3 rounded-[14px] border border-dashed border-border-strong px-3 py-2.5 text-[13px] transition-colors hover:border-foreground/40">
              <span className="text-label mt-[3px] w-16 shrink-0 text-muted-foreground">{l.label}</span>
              <span className="min-w-0">
                <span className="block font-medium">{l.node.title}</span>
                <span className="block font-mono text-[11px] text-muted-foreground">{l.note}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * /security request-path diagram (PLAN §5.3): Browser → Codexa Worker → ProjectSandbox Durable
 * Object → Container runner; previews on a separate origin; secrets through encryptSecret into D1.
 * Packets travel the paths (SVG animateMotion) only once the diagram has scrolled into view, and
 * freeze while it is off-screen, the tab is hidden or the visitor pauses it; calm (OS setting or the
 * site's Reduced motion) shows the static diagram. Each node links to the section that explains it.
 * Phones get the same path as a vertical rail (one packet travelling down it) with the preview and
 * secrets lanes beside it, instead of a sideways-scrolling drawing.
 */
export function RequestPathDiagram({ className, caption }: { className?: string; caption?: string }) {
  const figRef = React.useRef<HTMLElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const { playing, paused, setPaused, calm } = useAutoplay(figRef, { threshold: 0.3 });
  const id = React.useId().replace(/:/g, "");
  // Packets exist only once the diagram has been in view (so the server HTML and an off-screen
  // diagram are static); after that they freeze in place whenever playback stops.
  const [started, setStarted] = React.useState(false);
  if (playing && !started) setStarted(true);

  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof svg.pauseAnimations !== "function") return;
    if (playing) svg.unpauseAnimations();
    else svg.pauseAnimations();
  }, [playing, started]);

  return (
    <figure ref={figRef} className={cn("relative", className)}>
      <div className="relative overflow-hidden rounded-[18px] border border-border bg-card/70 shadow-[inset_0_1px_0_var(--hairline)]">
        <div aria-hidden="true" className="bg-blueprint pointer-events-none absolute inset-0 opacity-70" />
        <PhoneRail running={playing} started={started && !calm} />
        <svg ref={svgRef} viewBox="0 0 1000 440" role="group" aria-label="Request path through Codexa" className="relative hidden w-full md:block">
          <defs>
            <path id={`${id}-main`} d={PATHS.main} />
            <path id={`${id}-preview`} d={PATHS.preview} />
            <path id={`${id}-secrets`} d={PATHS.secrets} />
            <radialGradient id={`${id}-glow`}>
              <stop offset="0" stopColor="var(--signal)" stopOpacity="0.55" />
              <stop offset="1" stopColor="var(--signal)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Lanes */}
          <g fill="none" strokeWidth="1.5" strokeLinecap="round">
            <path d={PATHS.main} stroke="var(--border-strong)" />
            <path d={PATHS.preview} stroke="var(--border-strong)" strokeDasharray="5 6" />
            <path d={PATHS.secrets} stroke="var(--border-strong)" strokeDasharray="2 5" />
          </g>
          <g fontFamily="var(--font-mono)" fontSize="11" fill="var(--muted-foreground)">
            <text x="560" y="74">separate origin</text>
            <text x="490" y="420">secrets never leave the server</text>
          </g>
          {/* Packets: behind the nodes, so they pass through them. */}
          {calm || !started ? null : (
            <g className="calm:hidden">
              {(
                [
                  ["main", "4.2s", "0s"],
                  ["preview", "5.4s", "1.2s"],
                  ["secrets", "3.6s", "2s"],
                ] as const
              ).map(([k, dur, begin]) => (
                <g key={k}>
                  <circle r="14" fill={`url(#${id}-glow)`}>
                    <animateMotion dur={dur} begin={begin} repeatCount="indefinite" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.65 0 0.35 1">
                      <mpath href={`#${id}-${k}`} />
                    </animateMotion>
                  </circle>
                  <circle r="4" fill="var(--signal)">
                    <animateMotion dur={dur} begin={begin} repeatCount="indefinite" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.65 0 0.35 1">
                      <mpath href={`#${id}-${k}`} />
                    </animateMotion>
                  </circle>
                </g>
              ))}
            </g>
          )}
          {/* Nodes link to the section that explains them. */}
          {NODES.map((n) => (
            <a key={n.id} href={n.href} aria-label={`${n.title}: ${n.sub}`} className="group/node outline-none">
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={H}
                rx="14"
                fill="var(--card)"
                stroke={n.tone === "core" ? "var(--border-strong)" : "var(--border)"}
                strokeWidth="1"
                className="transition-[stroke] duration-200 group-hover/node:stroke-[var(--signal)] group-focus-visible/node:stroke-[var(--ring)] group-focus-visible/node:[stroke-width:2]"
              />
              {n.tone === "core" ? <rect x={n.x + 14} y={n.y} width={n.w - 28} height="1" fill="var(--signal)" opacity="0.7" /> : null}
              <text x={n.x + 16} y={n.y + 28} fontSize="14" fontWeight="600" fill="var(--foreground)" fontFamily="var(--font-sans)">
                {n.title}
              </text>
              <text x={n.x + 16} y={n.y + 47} fontSize="11.5" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
                {n.sub}
              </text>
            </a>
          ))}
        </svg>
        <div className="absolute bottom-3 right-3">
          <PauseButton paused={paused || calm} onToggle={() => setPaused((p) => !p)} label="Pause the request path animation" />
        </div>
      </div>
      <figcaption className="mt-3 text-pretty text-[13px] leading-relaxed text-muted-foreground">
        {caption ??
          "Diagram of the request path as implemented. The app and its API run in a Cloudflare Worker; each project gets a ProjectSandbox Durable Object that starts its own Container on demand. Previews are served from a separate origin. Secrets are encrypted with encryptSecret before they are stored in D1. Select a box to read the section that explains it."}
      </figcaption>
    </figure>
  );
}
