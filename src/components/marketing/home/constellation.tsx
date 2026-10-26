"use client";

import Link from "next/link";
import * as React from "react";
import { Settings2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo";
import { BrandMark } from "@/components/brand/brand-mark";
import { PauseButton } from "@/components/motion/autoplay";
import type { ConstellationNode } from "./data";

/** Inner orbit: AI, Git and hosting; outer orbit: data, payments and email. */
const INNER = new Set(["openai", "anthropic", "github", "vercel"]);
const SIZE = 600;
const RADII = { inner: 158, outer: 266 } as const;

function NodeCard({ node, id }: { node: ConstellationNode; id: string }) {
  return (
    <span
      id={id}
      role="tooltip"
      className="constellation__card glass pointer-events-none absolute left-1/2 top-full z-20 mt-3 w-60 rounded-[12px] border border-border-strong p-3 text-left shadow-xl"
    >
      <span className="text-label block text-muted-foreground">{node.categoryName}</span>
      <span className="mt-1.5 block text-[13px] font-medium text-foreground">{node.name}</span>
      <span className="mt-1 block text-[12px] leading-relaxed text-muted-foreground">{node.description}</span>
      <span className={cn("mt-2 flex items-center gap-1.5 text-[11.5px]", node.operatorConfigured ? "text-warning" : "text-foreground/80")}>
        {node.operatorConfigured ? <ShieldAlert className="size-3.5" aria-hidden="true" /> : <Settings2 className="size-3.5" aria-hidden="true" />}
        {node.operatorConfigured ? "Requires operator configuration" : "Connect and test it in workspace settings"}
      </span>
    </span>
  );
}

function Orbit({ nodes, radius, reverse, idPrefix }: { nodes: ConstellationNode[]; radius: number; reverse?: boolean; idPrefix: string }) {
  const c = SIZE / 2;
  const points = nodes.map((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2 + (reverse ? Math.PI / nodes.length : 0);
    return { n, x: c + radius * Math.cos(a), y: c + radius * Math.sin(a) };
  });
  return (
    <div className={cn("constellation__orbit absolute inset-0", reverse && "constellation__orbit--reverse")}>
      <svg aria-hidden="true" viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 size-full overflow-visible">
        {points.map((p, i) => (
          <g key={p.n.id}>
            <line x1={c} y1={c} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth="1" />
            <line
              x1={c}
              y1={c}
              x2={p.x}
              y2={p.y}
              pathLength={100}
              className="constellation__dot"
              stroke="var(--signal)"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ animationDuration: `${3 + ((i * 7) % 5) * 0.5}s`, animationDelay: `${-i * 0.9}s` } as React.CSSProperties}
            />
          </g>
        ))}
      </svg>
      {points.map((p) => {
        const cardId = `${idPrefix}-${p.n.id}`;
        return (
          <div key={p.n.id} className="constellation__slot absolute" style={{ left: p.x, top: p.y }}>
            <div className="constellation__upright -translate-x-1/2 -translate-y-1/2">
              <Link
                href={p.n.href}
                aria-label={`${p.n.name} integration`}
                aria-describedby={cardId}
                className="constellation__node group/node relative flex flex-col items-center gap-1.5 rounded-2xl outline-offset-4"
              >
                <span className="relative flex size-[52px] items-center justify-center rounded-2xl border border-border-strong bg-card text-foreground shadow-md transition-[transform,border-color,box-shadow] duration-(--dur-3) ease-snap group-hover/node:scale-110 group-hover/node:border-signal/50 group-hover/node:shadow-[var(--glow-signal)] group-focus-visible/node:scale-110">
                  <BrandMark id={p.n.id} className="size-6" />
                </span>
                <span className="whitespace-nowrap text-[11.5px] font-medium text-muted-foreground transition-colors group-hover/node:text-foreground">{p.n.name}</span>
                <NodeCard node={p.n} id={cardId} />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * H6 integrations constellation (PLAN §5.2): the user-connectable integrations (the providers
 * registry plus GitHub) as self-hosted brand marks on two slow orbits (120s a turn) around the
 * Codexa mark. Orbits pause on hover, focus, Pause, off-screen and calm; connector dots travel
 * only while it is on screen. Phones get a categorised grid instead.
 */
export function Constellation({ nodes }: { nodes: ConstellationNode[] }) {
  const [paused, setPaused] = React.useState(false);
  const inner = nodes.filter((n) => INNER.has(n.id));
  const outer = nodes.filter((n) => !INNER.has(n.id));

  return (
    <div>
      {/* md+: the constellation */}
      <div className="hidden md:block">
        <div data-onscreen-watch="" data-paused={paused ? "" : undefined} className="constellation relative mx-auto size-[600px]">
          <svg aria-hidden="true" viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 size-full">
            <defs>
              <radialGradient id="constellation-glow">
                <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADII.outer + 40} fill="url(#constellation-glow)" />
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADII.inner} fill="none" stroke="var(--border-strong)" strokeDasharray="2 6" />
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADII.outer} fill="none" stroke="var(--border)" strokeDasharray="2 6" />
          </svg>
          <Orbit nodes={outer} radius={RADII.outer} reverse idPrefix="cst-o" />
          <Orbit nodes={inner} radius={RADII.inner} idPrefix="cst-i" />
          <div className="e3 absolute left-1/2 top-1/2 flex size-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[28px]">
            <LogoMark size={52} />
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          <PauseButton paused={paused} onToggle={() => setPaused((p) => !p)} label="Pause the integrations orbit" showLabel />
        </div>
      </div>

      {/* Phones: a categorised grid */}
      <ul className="grid grid-cols-2 gap-2 md:hidden">
        {nodes.map((n) => (
          <li key={n.id}>
            <Link href={n.href} className="e1 flex h-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:border-border-strong">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                <BrandMark id={n.id} className="size-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{n.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{n.categoryName}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
