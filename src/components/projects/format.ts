/** Small formatting helpers shared by project list UIs (client-safe). */

export function relativeTime(iso: string | Date | null | undefined, now = Date.now()): string {
  if (!iso) return "never";
  const t = typeof iso === "string" ? Date.parse(iso) : iso.getTime();
  if (Number.isNaN(t)) return "";
  const diff = Math.max(0, now - t);
  const s = Math.round(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const y = Math.round(mo / 12);
  return `${y} year${y === 1 ? "" : "s"} ago`;
}

export const FRAMEWORK_LABELS: Record<string, string> = {
  "vite-react": "Vite + React",
  static: "Static",
  "node-express": "Node + Express",
  nextjs: "Next.js",
};

export function frameworkLabel(id: string) {
  return FRAMEWORK_LABELS[id] ?? id;
}

export const VISIBILITY_LABELS = { private: "Private", unlisted: "Unlisted", public: "Public" } as const;

/** Absolute date and time for `title` attributes next to relative times ("Oct 26, 2026, 9:41 PM"). */
export function absoluteTime(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

/** "Edited just now" / "Edited 2 hours ago". */
export function editedLabel(iso: string | Date | null | undefined, now = Date.now()): string {
  const rel = relativeTime(iso, now);
  return rel === "never" ? "Never opened" : `Edited ${rel}`;
}

export const VISIBILITY_HINTS = {
  private: "Only workspace members can open it",
  unlisted: "Anyone with a share link can open it",
  public: "Anyone with a share link can open it; marked public",
} as const;

/**
 * The most recent of "opened" and "edited" for a project, labelled honestly:
 * "Opened 2 hours ago" when the last thing recorded is an open, else "Edited …".
 */
export function lastTouch(p: { lastOpenedAt: string | null; updatedAt: string }, now = Date.now()): { iso: string; label: string } {
  const opened = p.lastOpenedAt ? Date.parse(p.lastOpenedAt) : NaN;
  const edited = Date.parse(p.updatedAt);
  if (!Number.isNaN(opened) && (Number.isNaN(edited) || opened >= edited)) return { iso: p.lastOpenedAt as string, label: `Opened ${relativeTime(p.lastOpenedAt, now)}` };
  return { iso: p.updatedAt, label: editedLabel(p.updatedAt, now) };
}
