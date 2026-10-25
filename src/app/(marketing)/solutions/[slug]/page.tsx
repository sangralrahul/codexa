import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routeMetadata } from "@/lib/seo";
import { SOLUTIONS, solutionBySlug } from "@/content/marketing/solutions";
import { SolutionPageTemplate } from "@/components/marketing/solution-page";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SOLUTIONS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = solutionBySlug.get(slug);
  if (!s) return routeMetadata("/solutions", { noindex: true });
  return routeMetadata(`/solutions/${slug}`, { title: `Codexa for ${s.name}`, description: s.title });
}

export default async function SolutionPage({ params }: Props) {
  const { slug } = await params;
  const solution = solutionBySlug.get(slug);
  if (!solution) notFound();
  return <SolutionPageTemplate solution={solution} />;
}
