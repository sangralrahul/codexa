import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PLATFORM_FEATURES } from "@/content/marketing/product";
import { HOME_FEATURES_COPY, HOME_FEATURE_TITLES } from "@/content/marketing/home";
import { SectionHeader } from "@/components/marketing/section";
import { Inline } from "@/components/marketing/inline";

/** H2 feature grid: eight shipped features from the product content model, each with its icon, title and two lines. */
export function HomeFeatureGrid() {
  const features = HOME_FEATURE_TITLES.map((t) => PLATFORM_FEATURES.find((f) => f.title === t)).filter((f): f is NonNullable<typeof f> => Boolean(f));
  return (
    <section aria-labelledby="features-title" className="border-b border-border py-14 lg:py-20">
      <div className="container-x">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader index={HOME_FEATURES_COPY.index} title={HOME_FEATURES_COPY.title} lead={HOME_FEATURES_COPY.lead} className="max-w-3xl" />
          <Link href={HOME_FEATURES_COPY.all.href} className="group/f inline-flex shrink-0 items-center gap-1 text-sm font-medium text-foreground lg:pb-1">
            <span className="link-draw">{HOME_FEATURES_COPY.all.label}</span>
            <ArrowRight className="size-3.5 transition-transform group-hover/f:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const Icon = f.icon;
            const body = (
              <>
                <span className="flex items-center justify-between gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-[8px] border border-border bg-surface text-foreground">{Icon ? <Icon className="size-4" aria-hidden="true" /> : null}</span>
                  {f.href ? <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden="true" /> : null}
                </span>
                <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                  <Inline text={f.description} />
                </p>
              </>
            );
            return (
              <li key={f.title} className="group rounded-[12px] border border-border bg-card transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-md">
                {f.href ? (
                  <Link href={f.href} className="block h-full rounded-[12px] p-5 outline-offset-[-2px]">
                    {body}
                  </Link>
                ) : (
                  <div className="p-5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
