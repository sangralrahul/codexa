import Link from "next/link";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { TemplatePreview } from "@/components/templates/template-preview";
import { needsTemplateCaption } from "@/components/app/project-thumb";
import { cn } from "@/lib/utils";
import { absoluteTime, frameworkLabel, lastTouch, relativeTime } from "./format";
import { StatusPills, type ProjectStatusDto } from "./status";
import { ResumeButton } from "./resume-button";

/** A recent project with its real state (built on the server from DB rows). Serializable. */
export type ResumeProject = {
  id: string;
  name: string;
  description: string;
  templateId: string | null;
  category: string;
  framework: string;
  workspaceName: string;
  lastOpenedAt: string | null;
  updatedAt: string;
  status: ProjectStatusDto | null;
  lastRun: { status: string; summary: string | null; changedFiles: number; finishedAt: string | null; createdAt: string } | null;
};

function RunLine({ run, aiConfigured }: { run: ResumeProject["lastRun"]; aiConfigured: boolean }) {
  if (!run) {
    return (
      <p className="text-[13px] text-muted-foreground">
        {aiConfigured ? "No AI runs yet. Describe a change in the editor’s chat to start one." : "AI isn’t configured on this server; you can still edit files and run the preview."}
      </p>
    );
  }
  const at = run.finishedAt ?? run.createdAt;
  const state =
    run.status === "running" || run.status === "queued"
      ? "In progress"
      : run.status === "failed"
        ? "Failed"
        : run.status === "cancelled"
          ? "Cancelled"
          : `${run.changedFiles} file${run.changedFiles === 1 ? "" : "s"} changed`;
  return (
    <div className="min-w-0">
      <p className="line-clamp-2 text-[13.5px] leading-snug text-foreground">{run.summary ?? "AI run without a written plan"}</p>
      <p className="text-meta mt-1 text-muted-foreground">
        <span className={cn(run.status === "failed" && "text-danger")}>{state}</span> ·{" "}
        <time dateTime={at} title={absoluteTime(at)}>
          {relativeTime(at)}
        </time>
      </p>
    </div>
  );
}

/**
 * "Continue building": the most recently opened project large (16:10 picture of its starting
 * template, live state, last AI run, deployed URL, "Open editor" with Enter to resume) beside up
 * to three smaller recents. Everything shown comes from DB rows. Server component.
 */
export function ContinueBuilding({ projects, canCreate = false, aiConfigured = false }: { projects: ResumeProject[]; canCreate?: boolean; aiConfigured?: boolean }) {
  const [lead, ...rest] = projects;
  if (!lead) return null;
  const leadTouch = lastTouch(lead);
  const withNew = rest.length < 3 && canCreate;
  const side = rest.length > 0 || canCreate;
  // Thumbnails take a big share of each row; a little less when three rows share the column.
  const thumb = rest.length + (withNew ? 1 : 0) >= 3 ? "w-[34%] max-w-[136px]" : "w-[44%] max-w-[176px]";
  return (
    <section aria-labelledby="continue-title">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="continue-title" className="text-[15px] font-semibold tracking-[-0.01em]">
          Continue building
        </h2>
        <Link href="/projects" className="link-draw inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
          All projects <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-4", side ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : "")}>
        <article data-resume-card className="e1 shot-pan group/lead relative grid overflow-hidden rounded-[18px] md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <Link href={`/projects/${lead.id}`} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/10] overflow-hidden border-b border-border bg-surface-2 md:aspect-auto md:min-h-[236px] md:border-b-0 md:border-r">
            <TemplatePreview
              id={lead.templateId ?? ""}
              category={lead.category}
              priority
              sizes="(min-width: 1280px) 440px, (min-width: 768px) 45vw, 100vw"
              className="h-full rounded-none border-0 shadow-none md:absolute md:inset-0 [&_img]:h-full md:[&_img]:object-left-top"
            />
            {needsTemplateCaption(lead.templateId) ? (
              <span className="pointer-events-none absolute right-2.5 top-2.5 inline-flex h-5 items-center rounded-full bg-background/80 px-2 text-[10.5px] font-medium text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] backdrop-blur-md">
                Template preview
              </span>
            ) : null}
          </Link>
          <div className="flex min-w-0 flex-col p-5 sm:p-6">
            <p className="text-meta text-muted-foreground">
              <time dateTime={leadTouch.iso} title={absoluteTime(leadTouch.iso)}>
                {leadTouch.label}
              </time>{" "}
              · {lead.workspaceName}
            </p>
            <h3 className="mt-1.5 truncate font-display text-[22px] font-semibold leading-tight tracking-[-0.02em]">
              <Link href={`/projects/${lead.id}`} className="outline-none focus-visible:underline">
                {lead.name}
              </Link>
            </h3>
            {lead.description ? <p className="mt-1 line-clamp-1 text-[13px] text-muted-foreground">{lead.description}</p> : null}
            <StatusPills status={lead.status} className="mt-3" />
            <div className="mt-4 flex gap-3 rounded-[12px] border border-border bg-surface/60 p-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent" aria-hidden="true">
                <Sparkles className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Last AI run</p>
                <div className="mt-1">
                  <RunLine run={lead.lastRun} aiConfigured={aiConfigured} />
                </div>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
              <ResumeButton href={`/projects/${lead.id}`} name={lead.name} enterToResume />
            </div>
          </div>
        </article>

        {side ? (
          // Up to three more recents as rows with a real 16:10 picture of their starting template (labelled),
          // then "Start something new". Rows share the lead card's height.
          <ul className="e1 flex flex-col divide-y divide-border overflow-hidden rounded-[18px]">
            {rest.map((p) => {
              const t = lastTouch(p);
              return (
                <li key={p.id} className="group/rec relative flex flex-1 items-center gap-4 p-3 pr-4 transition-colors hover:bg-foreground/[0.03]">
                  <div className={cn("relative aspect-[16/10] shrink-0 overflow-hidden rounded-[10px] bg-surface-2 shadow-[inset_0_0_0_1px_var(--border)]", thumb)} aria-hidden="true">
                    <TemplatePreview id={p.templateId ?? ""} category={p.category} sizes="176px" className="size-full rounded-none border-0 shadow-none [&_img]:h-full" />
                    {needsTemplateCaption(p.templateId) ? (
                      <span className="absolute bottom-1.5 left-1.5 inline-flex h-4 items-center rounded-full bg-background/80 px-1.5 text-[9.5px] font-medium text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] backdrop-blur-md">
                        Template preview
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium tracking-[-0.01em]">
                      <Link href={`/projects/${p.id}`} className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring">
                        {p.name}
                      </Link>
                    </p>
                    <p className="text-meta mt-0.5 truncate text-muted-foreground">{frameworkLabel(p.framework)}</p>
                    <p className="text-meta truncate text-foreground-dim">
                      <time dateTime={t.iso} title={absoluteTime(t.iso)}>
                        {t.label}
                      </time>
                    </p>
                    <StatusPills status={p.status} compact className="mt-1.5" />
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-[opacity,translate] duration-(--dur-2) group-hover/rec:translate-x-0.5 group-hover/rec:opacity-100 calm:transition-none [@media(hover:none)]:opacity-100" aria-hidden="true" />
                </li>
              );
            })}
            {withNew ? (
              <li className="group/rec relative flex flex-1 items-center gap-4 p-3 pr-4 transition-colors hover:bg-foreground/[0.03]">
                <span
                  className={cn(
                    "flex aspect-[16/10] shrink-0 items-center justify-center rounded-[10px] border border-dashed border-border-strong text-muted-foreground transition-colors group-hover/rec:border-foreground/30 group-hover/rec:text-foreground",
                    thumb,
                  )}
                  aria-hidden="true"
                >
                  <Plus className="size-5 transition-transform duration-(--dur-3) ease-snap group-hover/rec:rotate-90 calm:transition-none" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium tracking-[-0.01em]">
                    <Link href="/new-project" className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring">
                      Start something new
                    </Link>
                  </p>
                  <p className="text-meta mt-0.5 text-muted-foreground">From a sentence, a template or a GitHub repository</p>
                </div>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
