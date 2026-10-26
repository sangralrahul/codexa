import Link from "next/link";
import { ArrowRight, Code2, FileCode2, Star } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DifficultyBadge, FrameworkBadge } from "./badges";
import type { TemplateCardData } from "./types";
import { TemplateThumb } from "./template-thumb";

export function templatePreviewHref(id: string) {
  return `/templates/preview/${id}`;
}

/**
 * Gallery card. `action` is the "Use template" control: a link for the public
 * site, or a client button for the in-app gallery.
 */
export function TemplateCard({ template, action }: { template: TemplateCardData; action: React.ReactNode }) {
  const t = template;
  return (
    <li className="flex h-full flex-col glow-card rounded-2xl border border-border p-5 text-card-foreground">
      <TemplateThumb category={t.category} className="mb-4" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <FrameworkBadge name={t.frameworkName} />
          <DifficultyBadge level={t.difficulty} />
        </div>
        {t.featured ? (
          <Badge variant="accent" className="shrink-0">
            <Star className="size-3" aria-hidden="true" />
            Featured
          </Badge>
        ) : null}
      </div>
      <h3 className="mt-3 text-base font-semibold leading-tight">
        <Link href={templatePreviewHref(t.id)} className="hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
          {t.name}
        </Link>
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{t.description}</p>
      {t.tags.length ? (
        <ul className="mt-3 flex flex-wrap gap-1" aria-label="Tags">
          {t.tags.slice(0, 5).map((tag) => (
            <li key={tag}>
              <Badge variant="outline">{tag}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
        <FileCode2 className="size-3.5" aria-hidden="true" />
        {t.fileCount} file{t.fileCount === 1 ? "" : "s"}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        {action}
        <Link href={templatePreviewHref(t.id)} className={buttonClasses("outline", "sm")}>
          <Code2 className="size-3.5" aria-hidden="true" />
          Preview
        </Link>
      </div>
    </li>
  );
}

/** Public "Use template" link: new-project for signed-in users, signup (with next) otherwise. */
export function UseTemplateLink({ templateId, signedIn, size = "sm", label = "Use template" }: { templateId: string; signedIn: boolean; size?: "sm" | "md" | "lg"; label?: string }) {
  const target = `/new-project?template=${encodeURIComponent(templateId)}`;
  const href = signedIn ? target : `/signup?next=${encodeURIComponent(target)}`;
  return (
    <Link href={href} className={buttonClasses("primary", size)}>
      {label}
      <ArrowRight className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden="true" />
    </Link>
  );
}
