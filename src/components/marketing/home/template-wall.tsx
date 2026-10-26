"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PauseButton } from "@/components/motion/autoplay";
import { TemplatePreview } from "@/components/templates/template-preview";
import type { WallTile } from "./data";

const ROWS = [
  { duration: "70s", reverse: false },
  { duration: "90s", reverse: true },
  { duration: "80s", reverse: false },
];

function Tile({ t, clone }: { t: WallTile; clone?: boolean }) {
  return (
    <li data-marquee-clone={clone ? "" : undefined} className="wall-cell">
      <Link
        href={t.href}
        aria-hidden={clone || undefined}
        tabIndex={clone ? -1 : undefined}
        aria-label={clone ? undefined : `${t.name} — ${t.frameworkName} starter template`}
        data-spotlight-tile=""
        className="wall-tile shot-pan"
      >
        <TemplatePreview id={t.id} category={t.category} className="rounded-none border-0 shadow-none" imgClassName="block" />
        <span className="wall-tile__caption glass">
          <span className="wall-tile__name">
            <b>{t.name}</b>
            <span>{t.frameworkName}</span>
          </span>
          <span className="wall-tile__open">
            Open <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * H3 template theatre (PLAN §5.2, §6.4): real starter screenshots on a tilted plane that
 * flattens as it scrolls in (and on hover), three drifting rows (one on phones) that speed up
 * with scroll velocity and ease to a stop on hover or focus. Clones are aria-hidden and
 * unfocusable; Pause stops the drift; calm shows a static grid of the first row.
 */
export function TemplateWall({ tiles, children }: { tiles: WallTile[]; children?: React.ReactNode }) {
  const [paused, setPaused] = React.useState(false);
  const per = Math.ceil(tiles.length / ROWS.length);
  const rows = ROWS.map((r, i) => ({ ...r, tiles: tiles.slice(i * per, (i + 1) * per) })).filter((r) => r.tiles.length > 0);

  return (
    <div className="relative">
      <div className="wall-stage relative mt-8 md:mt-12 h-[224px] overflow-hidden sm:h-[300px] md:h-[620px]" data-spotlight="grid">
        <div className="scroll-scale h-full">
          <div className="wall-plane flex h-full flex-col justify-center">
            {rows.map((row, i) => (
              <div
                key={i}
                className={cn("marquee wall-row", i > 0 && "hidden md:block")}
                data-reverse={row.reverse ? "" : undefined}
                data-paused={paused ? "" : undefined}
                style={{ "--marquee-duration": row.duration } as React.CSSProperties}
              >
                <ul className="marquee__track">
                  {row.tiles.map((t) => (
                    <Tile key={t.id} t={t} />
                  ))}
                  {row.tiles.map((t) => (
                    <Tile key={`${t.id}-clone`} t={t} clone />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="container-x mt-6 flex flex-wrap items-center justify-between gap-3">
        {children}
        <PauseButton paused={paused} onToggle={() => setPaused((p) => !p)} label="Pause the template wall" showLabel />
      </div>
    </div>
  );
}
