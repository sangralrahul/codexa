export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 45) return "just now";
  const m = Math.round(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const FRAMEWORKS: Record<string, string> = { "vite-react": "Vite + React", nextjs: "Next.js", "node-express": "Node + Express", static: "Static site" };
export const frameworkLabel = (f: string) => FRAMEWORKS[f] ?? f;

/** "A todo app with tags, for teams" → "Todo app". */
export function nameFromPrompt(text: string): string {
  const first = text.replace(/\s+/g, " ").trim().split(/[.,;:!?\n(]|\s[-–—]\s/)[0] ?? "";
  const head = first.split(/\s+(?:for|with|where|that|which|to|so|using|in|on|from|and)\s+/i)[0] ?? first;
  const words = head
    .replace(/^(?:build|make|create)\s+(?:me\s+)?/i, "")
    .replace(/^(?:a|an|the|my|our)\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 4);
  const name = words.join(" ").replace(/[^\p{L}\p{N}\s'&/-]/gu, "").trim().slice(0, 60);
  return name ? name[0].toUpperCase() + name.slice(1) : "";
}

let appUrl = "";
export const setAppUrl = (u: string) => (appUrl = u);
export const getAppUrl = () => appUrl;
export const templateShot = (id: string | null | undefined) => (id ? `${appUrl}/templates/${id}-720.webp` : "");
