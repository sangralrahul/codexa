import { notFound } from "next/navigation";
import { routeMetadata } from "@/lib/seo";

/**
 * Individual role pages. There are no open roles, so every slug is a 404.
 * The route is kept so links in the manifest and future postings resolve.
 */
export const metadata = routeMetadata("/careers", { noindex: true });

export default async function CareerRolePage({ params }: { params: Promise<{ slug: string }> }) {
  await params;
  notFound();
}
