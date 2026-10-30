import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PLATFORM_FEATURES } from "@/content/marketing/product";
import { HOME_FEATURES_COPY, HOME_FEATURE_TITLES } from "@/content/marketing/home";
import { SectionHeader } from "@/components/marketing/section";
import { IconTile } from "@/components/marketing/premium";
import { Inline } from "@/components/marketing/inline";
import { CaptureTile, type CaptureId } from "@/components/marketing/captures";

/** Features that have a real capture of their own screen get a small picture on the card. */
const FEATURE_CAPTURE: Partial<Record<(typeof HOME_FEATURE_TITLES)[number], CaptureId>> = {
  "AI app builder": "composer",
  "AI agent": "agent",
  "Code editor": "editor",
  "Snapshots and diffs": "history",
  Deployment: "publish",
  Teams: "settings",
};

/** H2 feature grid: eight shipped features from the product content model as dark cards, each with a neutral icon tile, title, two lines, and a real capture where one exists. */
export function HomeFeatureGrid() {
  const features = HOME_FEATURE_TITLES.map((t) => PLATFORM_FEATURES.find((f) => f.title === t)).filter((f): f is NonNullable<typeof f> => Boolean(f));
  return (
    <section aria-labelledby="features-title" className="border-b border-border py-20 lg:py-28">
      <div className="container-x">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader id="features-title" index={HOME_FEATURES_COPY.index} title={HOME_FEATURES_COPY.title} lead={HOME_FEATURES_COPY.lead} className="max-w-3xl" />
          <Link href={HOME_FEATURES_COPY.all.href} className="group/f inline-flex shrink-0 items-center gap-1 text-[15px] font-semibold text-primary lg:pb-1">
            <span className="link-draw">{HOME_FEATURES_COPY.all.label}</span>
            <ArrowRight className="size-4 transition-transform group-hover/f:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const capture = FEATURE_CAPTURE[f.title as (typeof HOME_FEATURE_TITLES)[number]];
            const body = (
              <>
                {capture ? <CaptureTile id={capture} className="mb-5 rounded-[8px]" /> : null}
                <span className="flex items-center justify-between gap-3">
                  {f.icon ? <IconTile icon={f.icon} /> : null}
                  {f.href ? <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden="true" /> : null}
                </span>
                <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.015em] text-foreground">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                  <Inline text={f.description} />
                </p>
              </>
            );
            return (
              <li key={f.title} className="mk-card mk-card--hover group">
                {f.href ? (
                  <Link href={f.href} className="block h-full rounded-[16px] p-5 outline-offset-[-2px]">
                    {body}
                  </Link>
                ) : (
                  <div className="p-5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-5 text-[13px] text-muted-foreground">Pictures captured from the Codexa app on a development server.</p>
      </div>
    </section>
  );
}
