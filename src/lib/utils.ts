import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { site } from "@/config/site";

/**
 * The design system's type utilities (`@utility text-*` in globals.css) are
 * font sizes, not colours. Without this, tailwind-merge files every unknown
 * `text-*` class under text colour, so `cn("text-title", "text-muted-foreground")`
 * would silently drop `text-title`. `text-dim` / `text-foreground-dim` are
 * colours and need no entry (unknown `text-*` already merges as a colour).
 */
export const TYPE_SCALE_UTILITIES = [
  "display-1",
  "display-2",
  "display-3",
  "display-4",
  "title",
  "lead",
  "label",
  "eyebrow",
  "meta",
  "app-display",
  "app-title",
  "section-title",
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...TYPE_SCALE_UTILITIES] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "project";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || site.url;
  return new URL(path, base).toString();
}
