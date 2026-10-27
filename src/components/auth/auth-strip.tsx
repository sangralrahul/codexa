import { cn } from "@/lib/utils";
import { TEMPLATE_SHOTS, templateShotSrc } from "@/components/templates/shots";

/** The 720w capture when it exists (the tiles are 144px wide), else the 1440w one. */
function stripSrc(id: string) {
  return TEMPLATE_SHOTS.get(id)?.small ? `/templates/${id}-720.webp` : templateShotSrc(id);
}

/**
 * Phones and tablets (below lg): a two-line tagline and a slow strip of three real starter
 * screenshots under the form. The strip is decorative (aria-hidden copies); calm shows the
 * three thumbnails standing still in one row (auth.css) and the foundation .marquee rules
 * hide the clones.
 */
export function AuthStrip({ shots, className }: { shots: { id: string; name: string }[]; className?: string }) {
  if (shots.length === 0) return null;
  // Four copies of the three shots: the first set is real, the rest are marked clones so the loop is seamless and calm shows just three.
  const track = [0, 1, 2, 3].flatMap((copy) => shots.map((s) => ({ ...s, copy })));
  return (
    <div className={cn("mx-auto w-full max-w-[440px]", className)}>
      <p className="text-balance text-center text-sm font-medium text-foreground">
        From a sentence to a running app. <span className="text-dim">Real files you own, isolated previews, one-click deploys.</span>
      </p>
      <div aria-hidden="true" suppressHydrationWarning className="marquee auth-strip -mx-4 mt-5 overflow-hidden py-2">
        <div className="marquee__track gap-3 pr-3">
          {track.map((s, i) => (
            <figure key={`${s.id}-${i}`} data-marquee-clone={s.copy > 0 ? "" : undefined} className="auth-strip__tile e1 w-36 shrink-0 overflow-hidden rounded-[12px] p-1">
              {/* Same three URLs for every copy, so the clones cost no extra requests; low priority so they never compete with the form. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stripSrc(s.id)} alt="" width={720} height={450} decoding="async" fetchPriority="low" className="aspect-[16/10] w-full rounded-[8px] bg-surface object-cover object-top" />
            </figure>
          ))}
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Starter templates · real screenshots</p>
    </div>
  );
}
