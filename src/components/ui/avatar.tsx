import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Initials from a display name or email: "Rahul Sangral" → "RS", "rahul" → "R",
 * "rahul.sangral@x.com" → "RS". Never two letters of the same word (the old "RA" bug).
 */
export function initialsOf(name: string | null | undefined): string {
  const raw = (name ?? "").trim();
  if (!raw) return "?";
  const base = raw.includes("@") ? raw.split("@")[0].replace(/[._-]+/g, " ") : raw;
  const words = base.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  if (words.length === 0) return "?";
  const first = Array.from(words[0].replace(/[^\p{L}\p{N}]/gu, ""))[0] ?? "?";
  if (words.length === 1) return first.toUpperCase();
  const last = Array.from(words[words.length - 1].replace(/[^\p{L}\p{N}]/gu, ""))[0] ?? "";
  return (first + last).toUpperCase();
}

// Token pairs for the two-tone monogram (no hex in components).
const TONES: [string, string][] = [
  ["--signal", "--signal-2"],
  ["--accent", "--info"],
  ["--info", "--success"],
  ["--signal-2", "--danger"],
  ["--success", "--accent"],
  ["--accent", "--signal"],
  ["--info", "--accent"],
  ["--signal", "--accent"],
];

function toneFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  return TONES[Math.abs(h) % TONES.length];
}

const SIZES = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-[12px]",
  lg: "size-10 text-[14px]",
  xl: "size-14 text-[19px]",
} as const;

const DOT = { xs: "size-1.5", sm: "size-2", md: "size-2.5", lg: "size-3", xl: "size-3.5" } as const;

/**
 * Person or workspace avatar: a photo when `src` loads, otherwise a two-tone monogram
 * whose colours are derived from `seed` (default: the name). Presence adds a status dot.
 * Decorative by default (it usually sits next to the visible name); pass `labelled`
 * when it stands alone (avatar stacks) to expose "Name (online)" as role=img.
 * Server-safe. If the photo fails, the monogram underneath shows through.
 */
export function Avatar({
  name,
  src,
  size = "md",
  seed,
  presence = null,
  shape = "circle",
  labelled = false,
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  seed?: string;
  presence?: "online" | "away" | null;
  /** Workspaces use "square". */
  shape?: "circle" | "square";
  labelled?: boolean;
  className?: string;
}) {
  const [a, b] = toneFor(seed ?? name);
  const radius = shape === "circle" ? "rounded-full" : size === "xs" || size === "sm" ? "rounded-[6px]" : "rounded-[10px]";
  const label = presence ? `${name} (${presence})` : name;
  return (
    <span
      role={labelled ? "img" : undefined}
      aria-label={labelled ? label : undefined}
      aria-hidden={labelled ? undefined : true}
      className={cn("relative inline-flex shrink-0", className)}
    >
      <span
        className={cn("relative inline-flex select-none items-center justify-center overflow-hidden font-semibold tracking-tight text-white", radius, SIZES[size])}
        style={{
          background: `linear-gradient(135deg, color-mix(in oklab, var(${a}) 88%, var(--foreground) 12%), color-mix(in oklab, var(${b}) 80%, var(--background) 20%))`,
          boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--foreground) 10%, transparent), inset 0 1px 0 color-mix(in oklab, white 25%, transparent)",
          textShadow: "0 1px 1px color-mix(in oklab, black 30%, transparent)",
        }}
      >
        {initialsOf(name)}
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
        ) : null}
      </span>
      {presence ? <span className={cn("absolute -bottom-px -right-px rounded-full ring-2 ring-background", DOT[size], presence === "online" ? "bg-live" : "bg-warning")} /> : null}
    </span>
  );
}
