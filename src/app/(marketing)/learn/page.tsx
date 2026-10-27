import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { listDocs } from "@/lib/content";
import { GLOSSARY } from "@/lib/content/glossary";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { ArticleGrid } from "@/components/docs/article-bits";
import { cn } from "@/lib/utils";

export const metadata = routeMetadata("/learn");

type HubId = "guides" | "tutorials" | "blog" | "glossary" | "newsletter";

/** Small token-only illustrations, one per hub (decorative). */
function HubArt({ id, digest = [] }: { id: HubId; digest?: string[] }) {
  const frame = "relative h-36 overflow-hidden rounded-[14px] border border-border bg-surface";
  if (id === "guides") {
    return (
      <div aria-hidden="true" className={frame}>
        <div className="bg-dots absolute inset-0" />
        <ol className="absolute left-5 right-11 top-5 max-w-[22rem] space-y-2">
          {["Describe the app", "Review the plan", "Deploy"].map((s, i) => (
            <li key={s} className={cn("flex items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11.5px] shadow-sm", i === 1 && "translate-x-3", i === 2 && "translate-x-6")}>
              <span className={cn("grid size-4 place-items-center rounded-full text-[9px] font-semibold", i < 2 ? "bg-foreground text-background" : "border border-border-strong text-muted-foreground")}>{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    );
  }
  if (id === "tutorials") {
    return (
      <div aria-hidden="true" className={frame}>
        <div className="absolute inset-x-5 top-5 overflow-hidden rounded-[10px] border border-code-border bg-code-bg p-3 font-mono text-[10.5px] leading-relaxed text-code-fg shadow-lg">
          <p>
            <span className="text-syn-keyword">const</span> theme = <span className="text-syn-string">&quot;dark&quot;</span>;
          </p>
          <p className="text-code-muted">{"// toggle with one click"}</p>
          <p>
            <span className="text-syn-fn">setTheme</span>(t =&gt; t === <span className="text-syn-string">&quot;dark&quot;</span> ? <span className="text-syn-string">&quot;light&quot;</span> : <span className="text-syn-string">&quot;dark&quot;</span>);
          </p>
        </div>
      </div>
    );
  }
  if (id === "blog") {
    return (
      <div aria-hidden="true" className={cn(frame, "bg-[linear-gradient(135deg,color-mix(in_oklab,var(--signal)_22%,var(--surface)),var(--surface)_60%)]")}>
        <p className="font-display absolute bottom-4 left-5 right-5 text-[26px] font-bold leading-[0.95] tracking-[-0.04em] text-foreground/90">
          Notes from
          <br />
          <span className="text-dim">the build.</span>
        </p>
      </div>
    );
  }
  if (id === "glossary") {
    return (
      <div aria-hidden="true" className={frame}>
        <div className="absolute inset-0 grid grid-cols-6 place-items-center gap-1 p-4 font-display text-[22px] font-semibold text-foreground-dim">
          {"ABCDEFGHIJKL".split("").map((l, i) => (
            <span key={l} className={cn(i === 3 && "text-foreground", i === 8 && "text-signal-ink")}>
              {l}
            </span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div aria-hidden="true" className={frame}>
      <div className="absolute inset-x-6 top-5 rounded-[10px] border border-border bg-card p-3 shadow-lg">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
          <span className="text-[11px] font-semibold">Codexa updates</span>
          <span className="rounded-md bg-signal/15 px-1.5 py-px font-mono text-[9.5px] font-medium text-signal-ink">Changelog digest</span>
        </div>
        {/* The newest changelog entry titles, i.e. what a digest would actually contain. */}
        <ul className="mt-2 space-y-1">
          {digest.slice(0, 3).map((t) => (
            <li key={t} className="flex items-center gap-1.5 truncate text-[10.5px] text-muted-foreground">
              <span className="size-1 shrink-0 rounded-full bg-foreground-dim" />
              <span className="truncate">{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default async function LearnPage() {
  const [guides, tutorials, posts, changelog] = await Promise.all([listDocs("guides"), listDocs("tutorials"), listDocs("blog"), listDocs("changelog")]);
  const hubs: { id: HubId; href: string; title: string; description: string; count?: string }[] = [
    { id: "guides", href: "/guides", title: "Guides", description: "Step-by-step projects: first app, SaaS, ecommerce, databases, deployment, AI apps.", count: `${guides.length} guides` },
    { id: "tutorials", href: "/tutorials", title: "Tutorials", description: "Short exercises that show one feature of the agent or editor at a time.", count: `${tutorials.length} tutorials` },
    { id: "blog", href: "/blog", title: "Blog", description: "Engineering notes on how Codexa is built and how to use it well.", count: `${posts.length} posts` },
    { id: "glossary", href: "/glossary", title: "Glossary", description: "Terms used across the product and docs.", count: `${GLOSSARY.length} terms` },
    { id: "newsletter", href: "/newsletter", title: "Newsletter", description: "Product updates by email, nothing else." },
  ];
  const latest = [...guides.slice(0, 2), ...tutorials.slice(0, 2), ...posts.slice(0, 2)];

  return (
    <div data-tone="docs" className="container-x pb-20 pt-6 sm:pt-8 lg:pt-10">
      <Breadcrumbs items={[{ name: "Learn", path: "/learn" }]} />
      <header className="mt-12 max-w-3xl lg:mt-16">
        <p className="text-label flex items-center gap-2.5 text-muted-foreground">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-signal shadow-[0_0_0_3px_color-mix(in_oklab,var(--signal)_18%,transparent)]" />
          Learn
        </p>
        <h1 className="text-display-2 mt-5 max-w-[16ch]">
          Learn to build <span className="text-dim">with an agent.</span>
        </h1>
        <p className="text-lead mt-5">Guides, tutorials and articles on building software with an AI agent that edits real files. Written by the Codexa team against the product as it ships.</p>
      </header>

      <ul data-spotlight="grid" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {hubs.map((h, i) => (
          <li key={h.href} className={cn(i < 2 ? "lg:col-span-3" : "lg:col-span-2", i === hubs.length - 1 && "sm:max-lg:col-span-2")}>
            <Link
              href={h.href}
              data-spotlight-tile
              className="group flex h-full flex-col rounded-[20px] border border-border bg-card p-2.5 shadow-[inset_0_1px_0_var(--hairline)] transition-[border-color,box-shadow,translate] duration-(--dur-3) hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring calm:hover:translate-y-0"
            >
              <HubArt id={h.id} digest={changelog.map((c) => c.title)} />
              <span className="flex flex-1 flex-col px-2.5 pb-2 pt-4">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[17px] font-semibold tracking-[-0.01em]">{h.title}</span>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-[translate,color] duration-(--dur-3) group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
                </span>
                <span className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{h.description}</span>
                {h.count ? <span className="text-meta mt-3 text-foreground-dim">{h.count}</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="learn-latest" className="mt-16">
        <h2 id="learn-latest" className="text-display-4">
          Start with these
        </h2>
        <div className="mt-6">
          <ArticleGrid docs={latest} showSection emptyMessage="Nothing published yet." />
        </div>
      </section>

      <section aria-labelledby="learn-docs" className="mt-16 flex flex-col gap-4 rounded-[22px] border border-border bg-surface/60 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="learn-docs" className="text-[17px] font-semibold">
            Looking for reference material?
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            The{" "}
            <Link href="/docs" className="link-draw text-foreground">
              documentation
            </Link>{" "}
            covers every feature, and the{" "}
            <Link href="/api" className="link-draw text-foreground">
              API
            </Link>{" "}
            pages describe the HTTP endpoints.
          </p>
        </div>
      </section>
    </div>
  );
}
