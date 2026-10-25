import type { Metadata } from "next";
import { SectionArticle, sectionArticleMetadata, sectionStaticParams } from "@/components/docs/section-pages";

type Props = { params: Promise<{ slug: string }> };

export const generateStaticParams = () => sectionStaticParams("blog");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return sectionArticleMetadata("blog", slug);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <SectionArticle section="blog" slug={slug} sidebar="learn" />;
}
