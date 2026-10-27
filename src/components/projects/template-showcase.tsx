import { TemplateTile, type TemplateCardData } from "@/components/templates";
import { cn } from "@/lib/utils";

/**
 * Dashboard "Quick starts": a row of compact template tiles (the shared tile: real screenshot
 * in a slow-panning frame, name, "React · 12 files · Beginner" on one line) that open New project
 * with the template preselected. Server component.
 */
export function TemplateShowcase({ templates, className }: { templates: TemplateCardData[]; className?: string }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-6", className)}>
      {templates.map((t) => (
        <TemplateTile
          key={t.id}
          template={t}
          variant="compact"
          href={`/new-project?template=${encodeURIComponent(t.id)}`}
          sizes="(min-width: 1280px) 200px, (min-width: 640px) 30vw, 45vw"
          // One meta line on every tile ("HTML & CSS · 4 files · Beginner" truncates instead of wrapping), so the row stays even.
          className="[&_p.text-meta]:truncate"
        />
      ))}
    </ul>
  );
}
