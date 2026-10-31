import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { HOME_BENTO } from "@/content/marketing/home";
import { SectionHeader } from "@/components/marketing/section";
import { CaptureImage, type CaptureId } from "@/components/marketing/captures";
import { cn } from "@/lib/utils";
import { CheckpointList, ChecksPanel, LiveBadge, SandboxRail } from "./fragments";

type Cell = (typeof HOME_BENTO.cells)[number];

/** The visual for a cell: a real capture, or a live fragment built from the app's own markup. */
function Visual({ visual, publishChecks, commands }: { visual: Cell["visual"]; publishChecks: number; commands: readonly string[] }) {
  if (visual.startsWith("capture:")) {
    const id = visual.slice("capture:".length) as CaptureId;
    return (
      <div className="mk-bento__shot">
        <CaptureImage id={id} className="h-full" />
      </div>
    );
  }
  switch (visual) {
    case "fragment:checks":
      return <ChecksPanel total={publishChecks} />;
    case "fragment:checkpoints":
      return <CheckpointList />;
    case "fragment:rail":
      return <SandboxRail commands={commands} />;
    case "fragment:live":
      return <LiveBadge />;
    default:
      return null;
  }
}

/**
 * H2 bento: six cells of mixed size on a 4-column grid (one wide, one tall, four base). Every cell
 * carries either a real capture of the app or a small UI fragment rendered with the app's own
 * markup, then a title and two lines. Cells lift on hover; the whole cell is the link.
 */
export function Bento({ publishChecks, commands }: { publishChecks: number; commands: readonly string[] }) {
  return (
    <section aria-labelledby="features-title" className="border-b border-border py-20 lg:py-28">
      <div className="container-x">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader id="features-title" index={HOME_BENTO.index} title={HOME_BENTO.title} lead={HOME_BENTO.lead} className="max-w-3xl" />
          <Link href={HOME_BENTO.all.href} className="group/f inline-flex shrink-0 items-center gap-1 text-[15px] font-semibold text-primary lg:pb-1">
            <span className="link-draw">{HOME_BENTO.all.label}</span>
            <ArrowRight className="size-4 transition-transform group-hover/f:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        <ul className="mk-bento mt-12">
          {HOME_BENTO.cells.map((c) => (
            <li key={c.id} className={cn("mk-card mk-card--hover mk-bento__cell group", `mk-bento__cell--${c.size}`)}>
              <Link href={c.href} className="flex h-full flex-col rounded-[16px] outline-offset-[-2px]">
                <div className="mk-bento__visual">
                  <Visual visual={c.visual} publishChecks={publishChecks} commands={commands} />
                </div>
                <div className="mt-auto flex flex-col px-5 pb-5 pt-4">
                  <h3 className="flex items-center justify-between gap-3 text-[16.5px] font-semibold tracking-[-0.015em] text-foreground">
                    {c.title}
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden="true" />
                  </h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{c.body}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[13px] text-muted-foreground">Pictures captured from the Codexa app on a development server; the panels are drawn with the app&apos;s own components and sample names.</p>
      </div>
    </section>
  );
}
