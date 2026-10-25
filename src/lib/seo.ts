import type { Metadata } from "next";
import { site } from "@/config/site";
import { getRoute } from "@/config/routes";

export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  image?: string;
  type?: "website" | "article";
}): Metadata {
  const url = new URL(input.path, site.url).toString();
  const title = input.path === "/" ? input.title : `${input.title} · ${site.name}`;
  const image = input.image ?? "/opengraph-image";
  return {
    title,
    description: input.description,
    alternates: { canonical: url },
    robots: input.noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description: input.description,
      url,
      siteName: site.name,
      type: input.type ?? "website",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description: input.description, images: [image] },
  };
}

/** Metadata for a route listed in the manifest. */
export function routeMetadata(path: string, overrides?: Partial<Parameters<typeof pageMetadata>[0]>): Metadata {
  const r = getRoute(path);
  return pageMetadata({
    title: r?.title ?? site.name,
    description: r?.description ?? site.description,
    path,
    noindex: r?.noindex,
    ...overrides,
  });
}

export function jsonLd(data: Record<string, unknown>) {
  return { __html: JSON.stringify({ "@context": "https://schema.org", ...data }) };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return jsonLd({
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: new URL(it.path, site.url).toString(),
    })),
  });
}
