import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { routeMetadata } from "@/lib/seo";
import { getTemplate, isTemplateCategory, TEMPLATE_CATEGORIES, type TemplateCategory } from "@/templates";
import { PublicGalleryPage, type GallerySearchParams } from "../_shared";

const INTROS: Record<TemplateCategory, string> = {
  websites: "Content and marketing sites built from plain HTML and CSS. No build step, instant previews, and one-click deployment to Codexa static hosting.",
  "web-apps": "Interactive single-page applications and REST APIs. These are the most common starting points for AI generation runs.",
  saas: "Multi-page starters with sign-in, sign-up and an app area. Authentication is mocked locally and clearly labelled so you can swap in a real provider.",
  dashboards: "Analytics and operations layouts with stat cards, tables and dependency-free charts, ready to point at your own data.",
  ecommerce: "Catalog, product detail and cart flows with local state. Connect a payment provider on the server before taking orders.",
  portfolios: "Personal sites for developers and designers, in React or plain HTML, with projects data kept in one editable file.",
  "ai-tools": "Chat and assistant interfaces that talk to a backend you control. No provider keys ever ship to the browser.",
  "admin-panels": "CRUD tables, forms with validation, sorting and pagination — the internal tools every product ends up needing.",
  crm: "Contacts, deal stages and pipeline boards with inline editing.",
  "landing-pages": "Conversion-focused single pages with hero, features, pricing, FAQ and email capture sections.",
  "mobile-first": "Phone-first shells with bottom navigation and safe-area handling, framed as a device on larger screens.",
};

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  if (!isTemplateCategory(category)) return routeMetadata("/templates", { noindex: true });
  return routeMetadata(`/templates/${category}`);
}

export default async function TemplateCategoryPage({ params, searchParams }: { params: Promise<{ category: string }>; searchParams: Promise<GallerySearchParams> }) {
  const { category } = await params;
  if (!isTemplateCategory(category)) {
    // Old-style /templates/<template-id> links (e.g. from the search index) go to the preview page.
    if (getTemplate(category)) permanentRedirect(`/templates/preview/${category}`);
    notFound();
  }
  const def = TEMPLATE_CATEGORIES.find((c) => c.id === category)!;
  const sp = await searchParams;
  return (
    <PublicGalleryPage
      searchParams={sp}
      category={category}
      title={`${def.name} templates`}
      intro={INTROS[category]}
      crumbs={[
        { name: "Templates", path: "/templates" },
        { name: def.name, path: `/templates/${category}` },
      ]}
    />
  );
}
