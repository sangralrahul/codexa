"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, FileCode2, Layers, Package, Terminal } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { BrowserFrame } from "@/components/frames/browser-frame";
import { DeviceFrame } from "@/components/frames/device-frame";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileTree } from "./file-tree";
import { RouteList, TemplatePreview } from "./template-preview";
import { TEMPLATE_API_ROUTES } from "./api-routes.generated";
import { TEMPLATE_SHOTS } from "./shots";
import { templatePreviewHref } from "./template-card";
import type { ReadmeBlock, TemplateSheetDetail } from "./template-details";
import { useGallery } from "./gallery-state";

/** Inline `code` spans in README text. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[12px] text-foreground">
            {part.slice(1, -1)}
          </code>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

function Readme({ blocks }: { blocks: ReadmeBlock[] }) {
  return (
    <div className="space-y-3 text-[13.5px] leading-relaxed text-muted-foreground">
      {blocks.map((b, i) =>
        b.kind === "h" ? (
          <h4 key={i} className="pt-1 text-[13px] font-semibold text-foreground">
            {b.text}
          </h4>
        ) : b.kind === "code" ? (
          <pre key={i} className="scrollbar-thin overflow-x-auto rounded-lg border border-code-border bg-code-bg px-3 py-2.5 font-mono text-[12px] leading-relaxed text-code-fg">
            {b.text}
          </pre>
        ) : b.kind === "ul" ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.items?.map((it, j) => (
              <li key={j}>
                <Inline text={it} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="text-pretty">
            <Inline text={b.text} />
          </p>
        ),
      )}
    </div>
  );
}

/**
 * In-app template preview (PLAN §5.4): a 720px right sheet opened from a tile or its Preview action,
 * deep-linkable with `?preview=<id>`. Large real screenshot, README excerpt, the real file tree and
 * a sticky "Use template" footer (the same UseTemplateButton as the tile, with Launch).
 */
export function TemplatePreviewSheet({ details, actions }: { details: Record<string, TemplateSheetDetail>; actions: Record<string, React.ReactNode> }) {
  const { preview, openPreview, items } = useGallery();
  // Keep the last template rendered while the sheet animates closed.
  const [shown, setShown] = React.useState<string | null>(preview);
  if (preview && preview !== shown) setShown(preview);
  const t = items.find((x) => x.id === shown);
  const d = shown ? details[shown] : undefined;
  const open = Boolean(preview && details[preview]);
  const hasShot = Boolean(shown && TEMPLATE_SHOTS.has(shown));
  const routes = shown ? TEMPLATE_API_ROUTES[shown] : undefined;

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? undefined : openPreview(null))}>
      {t && d ? (
        <SheetContent
          width={720}
          className="[--btn-radius:10px]"
          title={t.name}
          description={t.description}
          bodyClassName="px-0 py-0"
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href={templatePreviewHref(t.id)} className={buttonClasses("ghost", "sm", "text-muted-foreground")} target="_blank" rel="noopener">
                Open full page
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
              <div className="[&_[role=alert]]:max-w-xs">{actions[t.id]}</div>
            </div>
          }
        >
          <div className="relative overflow-hidden border-b border-border bg-surface px-5 pb-6 pt-5">
            <div aria-hidden="true" className="bg-dots absolute inset-0 opacity-70" />
            {!hasShot && routes ? (
              // API-only starters have no screen: show their real route list (read from the source).
              <RouteList routes={routes} variant="hero" command={d.devCommand} className="relative rounded-md shadow-xl" />
            ) : !hasShot ? (
              <TemplatePreview id={t.id} category={t.category} className="relative shadow-xl" />
            ) : t.category === "mobile-first" ? (
              <div className="relative mx-auto h-[360px] [container-type:size]">
                <DeviceFrame device="phone" fit="height">
                  <TemplatePreview id={t.id} category={t.category} sizes="200px" className="size-full rounded-none border-0 shadow-none" imgClassName="size-full aspect-auto object-cover object-top" />
                </DeviceFrame>
              </div>
            ) : (
              <BrowserFrame url={d.url} chrome="minimal" className="relative shadow-xl">
                <TemplatePreview id={t.id} category={t.category} sizes="(min-width: 760px) 680px, 100vw" pan className="rounded-none border-0 shadow-none" />
              </BrowserFrame>
            )}
            <p className="text-meta relative mt-3 text-center text-muted-foreground">
              {hasShot ? "Starter screenshot, captured from this template\u2019s own build." : "An API with no screen: these routes are read from the template\u2019s own source."}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4">
            {[
              { icon: Layers, label: "Framework", value: d.frameworkName },
              { icon: FileCode2, label: "Files", value: String(t.fileCount) },
              { icon: Package, label: "Dependencies", value: d.dependencyCount ? String(d.dependencyCount) : "None" },
              { icon: Terminal, label: "Runs with", value: d.devCommand },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-card px-5 py-3.5">
                <dt className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Icon className="size-3.5" aria-hidden="true" />
                  {label}
                </dt>
                <dd className={cn("mt-1 text-[13.5px] font-medium leading-snug", label === "Runs with" && "font-mono text-[12.5px]")}>{value}</dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-8 px-5 py-6 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <section aria-labelledby="sheet-readme">
              <h3 id="sheet-readme" className="mb-3 text-[13px] font-semibold">
                README
              </h3>
              <Readme blocks={d.readme} />
              {t.tags.length ? (
                <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Tags">
                  {t.tags.map((tag) => (
                    <li key={tag} className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11.5px] text-muted-foreground">
                      {tag}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
            <section aria-labelledby="sheet-files">
              <h3 id="sheet-files" className="mb-2 flex items-baseline justify-between text-[13px] font-semibold">
                Files <span className="text-meta font-normal text-muted-foreground">{d.paths.length}</span>
              </h3>
              <div className="rounded-lg border border-border bg-surface p-1.5">
                <FileTree paths={d.paths} label={`${t.name} files`} />
              </div>
            </section>
          </div>
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
