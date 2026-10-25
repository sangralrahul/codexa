import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { getAdjacent, getBySection, getDoc, getRelated } from "@/lib/content";
import { sectionSidebar } from "@/lib/content/nav";
import { ContentArticle } from "@/components/docs/article-layout";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getBySection("docs")).map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDoc("docs", slug);
  if (!doc) return { title: "Not found" };
  return pageMetadata({ title: doc.title, description: doc.description, path: doc.href, type: "article" });
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const doc = await getDoc("docs", slug);
  if (!doc) notFound();
  const [sidebar, { prev, next }, related] = await Promise.all([sectionSidebar("docs"), getAdjacent("docs", slug), getRelated(doc)]);
  return (
    <ContentArticle
      doc={doc}
      sidebar={sidebar}
      prev={prev}
      next={next}
      related={related}
      crumbs={[
        { name: "Documentation", path: "/docs" },
        { name: doc.category, path: `/docs#group-${encodeURIComponent(doc.category)}` },
        { name: doc.title, path: doc.href },
      ]}
    />
  );
}
