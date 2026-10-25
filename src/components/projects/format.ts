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
