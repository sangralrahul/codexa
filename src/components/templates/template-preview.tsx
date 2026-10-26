import { cn } from "@/lib/utils";
import { TemplateThumb } from "./template-thumb";
import { TEMPLATE_SHOTS } from "./shots";

/**
 * Template picture for cards: a real screenshot of the built template when one exists,
 * a code window for API-only templates (they have no screen), otherwise the drawn thumbnail.
 */
export function TemplatePreview({ id, category, className, imgClassName }: { id: string; category: string; className?: string; imgClassName?: string }) {
  if (TEMPLATE_SHOTS.has(id)) {
    return (
      <div className={cn("overflow-hidden rounded-lg border border-border bg-white shadow-sm", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/templates/${id}.webp`} alt="" loading="lazy" decoding="async" width={960} height={600} className={cn("aspect-[16/10] w-full object-cover object-top", imgClassName)} />
      </div>
    );
  }
  if (id.startsWith("node-express")) {
    return (
      <div aria-hidden="true" className={cn("overflow-hidden rounded-lg border border-border bg-code-bg font-mono text-[10px] leading-relaxed text-code-fg shadow-sm", className)}>
        <div className="aspect-[16/10] p-3">
          <p className="text-white/40">$ curl /api/{id.includes("notes") ? "notes" : "items"}</p>
          <p>
            <span className="text-white/50">{"{"}</span>
          </p>
          <p className="pl-3">
            <span className="hljs-title">&quot;data&quot;</span>: [
          </p>
          <p className="pl-6">
            {"{ "}
            <span className="hljs-title">&quot;id&quot;</span>: <span className="hljs-number">1</span>, <span className="hljs-title">&quot;title&quot;</span>: <span className="hljs-string">&quot;Hello&quot;</span>
            {" }"}
          </p>
          <p className="pl-3">],</p>
          <p className="pl-3">
            <span className="hljs-title">&quot;status&quot;</span>: <span className="hljs-string">&quot;ok&quot;</span>
          </p>
          <p className="text-white/50">{"}"}</p>
          <p className="mt-2 text-success">GET /api/health 200 · 3 ms</p>
        </div>
      </div>
    );
  }
  return <TemplateThumb category={category} className={className} />;
}
