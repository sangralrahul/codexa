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

/**
 * /security request-path diagram (PLAN §5.3): Browser → Codexa Worker → ProjectSandbox Durable
 * Object → Container runner; previews on a separate origin; secrets through encryptSecret into D1.
 * Packets travel the paths (SVG animateMotion) only while the diagram is in view and not paused;
 * calm (OS setting or the site's Reduced motion) shows the static diagram. Each node links to the
 * section that explains it. Phones scroll it sideways.
 */
export function RequestPathDiagram({ className, caption }: { className?: string; caption?: string }) {
  const figRef = React.useRef<HTMLElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const { playing, paused, setPaused, calm } = useAutoplay(figRef, { threshold: 0.3 });
  const id = React.useId().replace(/:/g, "");

  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof svg.pauseAnimations !== "function") return;
    if (playing) svg.unpauseAnimations();
    else svg.pauseAnimations();
  }, [playing]);

  return (
    <figure ref={figRef} className={cn("relative", className)}>
      <div className="relative overflow-x-auto rounded-[18px] border border-border bg-card/70 shadow-[inset_0_1px_0_var(--hairline)] [scrollbar-width:thin]">
        <div aria-hidden="true" className="bg-blueprint pointer-events-none absolute inset-0 opacity-70" />
        <svg ref={svgRef} viewBox="0 0 1000 440" role="group" aria-label="Request path through Codexa" className="relative block w-full min-w-[760px]">
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
          {calm ? null : (
            <g>
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
