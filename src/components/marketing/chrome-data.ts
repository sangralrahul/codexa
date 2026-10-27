import { cache } from "react";
import { formatDate, listDocs } from "@/lib/content";
import { getTemplate } from "@/templates";
import { TEMPLATE_SHOTS } from "@/components/templates/shots";
import { NAV } from "@/config/routes";

/** Serializable data the client header needs for its featured wells (no template files, no markdown bodies). */
export type ChromeData = {
  changelog: { title: string; description: string; href: string; date: string; dateLabel: string; version?: string; count: number } | null;
  /** Real starters with a captured screenshot, for the 2×2 "templates" well. */
  templates: { id: string; name: string }[];
  /** Template id → name for every solution well in the nav. */
  shots: Record<string, string>;
};

const WALL = ["vite-react-dashboard", "vite-react-storefront", "vite-react-crm", "vite-react-saas"];

/** Read once per request: the latest changelog entry and the template names the header wells show. */
export const getChromeData = cache(async (): Promise<ChromeData> => {
  let changelog: ChromeData["changelog"] = null;
  try {
    const entries = await listDocs("changelog");
    const latest = entries[0];
    if (latest) {
      changelog = {
        title: latest.title,
        description: latest.description,
        href: latest.href,
        date: latest.date,
        dateLabel: formatDate(latest.date),
        version: latest.version,
        count: entries.length,
      };
    }
  } catch {
    changelog = null;
  }
  const named = (id: string) => (TEMPLATE_SHOTS.has(id) ? getTemplate(id) : undefined);
  const templates = WALL.flatMap((id) => {
    const t = named(id);
    return t ? [{ id: t.id, name: t.name }] : [];
  });
  const shots: Record<string, string> = {};
  for (const item of NAV.solutions) {
    const t = named(item.template);
    if (t) shots[t.id] = t.name;
  }
  return { changelog, templates, shots };
});
