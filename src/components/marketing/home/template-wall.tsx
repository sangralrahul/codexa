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
/**
 * Tiles per row (before the marquee clone). One copy must be wider than the widest screen the wall
 * spans (8 × 380px ≈ 3040px), or the loop shows a gap at its seam; a short row wraps around the list.
 */
const MIN_PER_ROW = 8;

/** Rows of tiles; a tile repeated in a later row (because the list wrapped) is a duplicate for AT. */
function buildRows(tiles: WallTile[]) {
  const per = Math.max(MIN_PER_ROW, Math.ceil(tiles.length / ROWS.length));
  const step = Math.ceil(tiles.length / ROWS.length);
  const seen = new Set<string>();
  return ROWS.map((r, i) => {
    const row = tiles.length ? Array.from({ length: per }, (_, k) => tiles[(i * step + k) % tiles.length]) : [];
    return {
      ...r,
      tiles: row.map((t, k) => {
        const repeat = seen.has(t.id);
        seen.add(t.id);
        return { t, key: `${t.id}-${k}`, repeat };
      }),
    };
  }).filter((r) => r.tiles.length > 0);
}

function Tile({ t, clone, repeat }: { t: WallTile; clone?: boolean; repeat?: boolean }) {
  const hidden = clone || repeat;
  return (
    <li data-marquee-clone={clone ? "" : undefined} className="wall-cell">
      <Link
        href={t.href}
        aria-hidden={hidden || undefined}
        tabIndex={hidden ? -1 : undefined}
        aria-label={hidden ? undefined : `${t.name} — ${t.frameworkName} starter template`}
        data-spotlight-tile=""
        className="wall-tile shot-pan"
      >
        <TemplatePreview id={t.id} category={t.category} sizes="(min-width: 64rem) 360px, (min-width: 40rem) 300px, 260px" className="rounded-none border-0 shadow-none" imgClassName="block" />
        <span className="wall-tile__caption">
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
 * with scroll velocity and ease to a stop on hover or focus. Each tile's name card is opaque and
 * appears on hover (pointer devices) or keyboard focus; on phones the name sits under the shot.
 * Clones are aria-hidden and unfocusable; Pause stops the drift; calm shows a static grid of the first row.
 */
export function TemplateWall({ tiles, children }: { tiles: WallTile[]; children?: React.ReactNode }) {
  const [paused, setPaused] = React.useState(false);
  const rows = React.useMemo(() => buildRows(tiles), [tiles]);

  return (
    <div className="relative">
      {/* Phones: one row of 260px tiles with the name strip under each (162px shot + 30px strip + cell padding). */}
      <div className="wall-stage relative mt-8 h-[214px] overflow-hidden md:mt-12 md:h-[620px]" data-spotlight="grid">
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
                  {row.tiles.map(({ t, key, repeat }) => (
                    <Tile key={key} t={t} repeat={repeat} />
                  ))}
                  {row.tiles.map(({ t, key }) => (
                    <Tile key={`${key}-clone`} t={t} clone />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="container-x mt-6 flex flex-wrap items-center justify-between gap-3">
        {children}
        <PauseButton paused={paused} onToggle={() => setPaused((p) => !p)} label="Pause the template wall" showLabel className="calm:hidden" />
      </div>
    </div>
  );
}
