import Link from "next/link";
import { BookOpen, GraduationCap, Newspaper, BookA, Video, Mail, ArrowRight } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { listDocs } from "@/lib/content";
import { GLOSSARY } from "@/lib/content/glossary";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { ArticleGrid } from "@/components/docs/article-bits";

export const metadata = routeMetadata("/learn");

const HUBS = [
  { href: "/guides", title: "Guides", description: "Step-by-step projects: first app, SaaS, ecommerce, databases, deployment, AI apps.", Icon: BookOpen },
  { href: "/tutorials", title: "Tutorials", description: "Short exercises that show one feature of the agent or editor at a time.", Icon: GraduationCap },
  { href: "/blog", title: "Blog", description: "Engineering notes on how Codexa is built and how to use it well.", Icon: Newspaper },
  { href: "/glossary", title: "Glossary", description: `${GLOSSARY.length} terms used across the product and docs.`, Icon: BookA },
  { href: "/webinars", title: "Webinars", description: "None recorded yet. Subscribe to hear about the first one.", Icon: Video },
  { href: "/newsletter", title: "Newsletter", description: "Product updates by email, nothing else.", Icon: Mail },
];

export default async function LearnPage() {
  const [guides, tutorials, posts] = await Promise.all([listDocs("guides"), listDocs("tutorials"), listDocs("blog")]);
  const latest = [...guides.slice(0, 2), ...tutorials.slice(0, 2), ...posts.slice(0, 2)];
  return (
    <div className="container-x py-10 sm:py-14">
      <Breadcrumbs items={[{ name: "Learn", path: "/learn" }]} className="mb-4" />
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Learn</h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">Guides, tutorials and articles on building software with an AI agent that edits real files. Written by the Codexa team against the product as it ships.</p>
      </header>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HUBS.map(({ href, title, description, Icon }) => (
          <li key={href}>
            <Link href={href} className="group flex h-full flex-col rounded-xl border border-border p-5 transition hover:border-border-strong hover:bg-muted/40">
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <span className="mt-3 flex items-center justify-between font-semibold group-hover:text-primary">
                {title}
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </span>
              <span className="mt-1 text-sm text-muted-foreground">{description}</span>
            </Link>
          </li>
        ))}
      </ul>
      <section aria-labelledby="learn-latest" className="mt-14">
        <h2 id="learn-latest" className="text-xl font-semibold tracking-tight">
          Start with these
        </h2>
        <div className="mt-4">
          <ArticleGrid docs={latest} showSection emptyMessage="Nothing published yet." />
        </div>
      </section>
      <section aria-labelledby="learn-docs" className="mt-14 rounded-xl border border-border bg-muted/30 p-6">
        <h2 id="learn-docs" className="text-lg font-semibold">
          Looking for reference material?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The <Link href="/docs" className="text-primary underline">documentation</Link> covers every feature, and the <Link href="/api" className="text-primary underline">API</Link> pages describe the HTTP endpoints.
        </p>
      </section>
    </div>
  );
}
