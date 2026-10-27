import "server-only";
import { getNavigation } from "./index";
import type { ContentSection } from "./types";

export type NavGroupLink = { category: string; items: { title: string; href: string }[] };

/** Sidebar groups for a markdown section (docs, help, guides, tutorials). */
export async function sectionSidebar(section: ContentSection): Promise<NavGroupLink[]> {
  const groups = await getNavigation(section);
  return groups.map((g) => ({ category: g.category, items: g.items.map((d) => ({ title: d.title, href: d.href })) }));
}

/** Static sidebar for the developer area (hand-written pages). */
export const DEV_SIDEBAR: NavGroupLink[] = [
  { category: "Developers", items: [{ title: "Overview", href: "/developers" }] },
  {
    category: "HTTP API",
    items: [
      { title: "API overview", href: "/api" },
      { title: "Reference", href: "/api/reference" },
      { title: "Authentication", href: "/api/authentication" },
      { title: "Projects", href: "/api/projects" },
      { title: "Generations", href: "/api/generations" },
      { title: "Deployments", href: "/api/deployments" },
      { title: "Webhooks", href: "/api/webhooks" },
    ],
  },
  {
    category: "Tools",
    items: [
      { title: "SDK (not yet available)", href: "/sdk" },
      { title: "CLI (not yet available)", href: "/cli" },
    ],
  },
];

/** Static sidebar for the learning center. /webinars stays reachable by URL but is not in the nav (no sessions yet). */
export const LEARN_SIDEBAR: NavGroupLink[] = [
  {
    category: "Learn",
    items: [
      { title: "Overview", href: "/learn" },
      { title: "Guides", href: "/guides" },
      { title: "Tutorials", href: "/tutorials" },
      { title: "Blog", href: "/blog" },
      { title: "Glossary", href: "/glossary" },
      { title: "Newsletter", href: "/newsletter" },
    ],
  },
];
