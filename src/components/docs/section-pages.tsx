import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { getAdjacent, getBySection, getDoc, getRelated } from "@/lib/content";
import { SECTION_BASE_PATH, SECTION_LABEL, type ContentSection } from "@/lib/content/types";
import { LEARN_SIDEBAR, sectionSidebar, type NavGroupLink } from "@/lib/content/nav";
import { ContentArticle } from "./article-layout";

/**
 * Shared implementation for /<section>/[slug] pages so each route file stays
 * a thin wrapper. `sidebar` picks the navigation rail: the section's own
 * categories, the learning-center links, or none.
 */
export type SidebarKind = "section" | "learn" | "none";

export async function sectionStaticParams(section: ContentSection) {
  return (await getBySection(section)).map((d) => ({ slug: d.slug }));
}

export async function sectionArticleMetadata(section: ContentSection, slug: string): Promise<Metadata> {
  const doc = await getDoc(section, slug);
  if (!doc) return { title: "Not found" };
  return pageMetadata({ title: doc.title, description: doc.description, path: doc.href, type: "article" });
}

export async function SectionArticle({ section, slug, sidebar = "section" }: { section: ContentSection; slug: string; sidebar?: SidebarKind }) {
  const doc = await getDoc(section, slug);
  if (!doc) notFound();
  const [rail, { prev, next }, related] = await Promise.all([
    sidebar === "section" ? sectionSidebar(section) : Promise.resolve<NavGroupLink[] | undefined>(sidebar === "learn" ? LEARN_SIDEBAR : undefined),
    getAdjacent(section, slug),
    getRelated(doc),
  ]);
  const base = SECTION_BASE_PATH[section];
  const crumbs = sidebar === "learn" ? [{ name: "Learn", path: "/learn" }, { name: SECTION_LABEL[section], path: base }, { name: doc.title, path: doc.href }] : [{ name: SECTION_LABEL[section], path: base }, { name: doc.title, path: doc.href }];
  return <ContentArticle doc={doc} sidebar={rail} prev={prev} next={next} related={related} crumbs={crumbs} />;
}
