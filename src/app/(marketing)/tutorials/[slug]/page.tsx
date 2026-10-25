import type { Metadata } from "next";
import { SectionArticle, sectionArticleMetadata, sectionStaticParams } from "@/components/docs/section-pages";

type Props = { params: Promise<{ slug: string }> };

export const generateStaticParams = () => sectionStaticParams("tutorials");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return sectionArticleMetadata("tutorials", slug);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <SectionArticle section="tutorials" slug={slug} sidebar="learn" />;
}
