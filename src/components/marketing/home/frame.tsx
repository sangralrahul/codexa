import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Primitives of the home page's construction grid: crosshair marks on row corners and the
 * numbered section head (mono eyebrow with a square bullet, two-tone H2, paragraph on the right).
 */
type Corner = "tl" | "tr" | "bl" | "br";

export function Crosshairs({ corners = ["tl", "tr", "bl", "br"] }: { corners?: Corner[] }) {
  return (
    <>
      {corners.map((c) => (
        <span key={c} aria-hidden="true" className={cn("mkg-x", `mkg-x--${c}`)} />
      ))}
    </>
  );
}

export function Eyebrow({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <p className="mkg-eyebrow">
      <i aria-hidden="true" />
      <span>
        {index}
        <span className="ml-2.5">{children}</span>
      </span>
    </p>
  );
}

export function SectionHead({ id, index, label, title, dim, children }: { id: string; index: string; label: string; title: string; dim: string; children: React.ReactNode }) {
  return (
    <div className="mkg-sh">
      <div>
        <Eyebrow index={index}>{label}</Eyebrow>
        <h2 id={id} className="mkg-h2">
          {title}
          <br />
          <span>{dim}</span>
        </h2>
      </div>
      <div className="mkg-sh__p">{children}</div>
    </div>
  );
}
