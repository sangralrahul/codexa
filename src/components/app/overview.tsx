import Link from "next/link";
import { ArrowUpRight, Plus, Smartphone } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PromptBox, type PromptMode } from "@/components/projects/prompt-box";
import type { ProjectCardItem } from "@/components/projects/project-card";
import type { DeploymentRow } from "@/components/projects/deployments-card";
import type { KpiEntitlements } from "@/components/projects/kpi-row";
import { GettingStarted, type ChecklistMilestones } from "@/components/projects/getting-started";
import { absoluteTime, frameworkLabel, lastTouch, relativeTime } from "@/components/projects/format";
import { TEMPLATE_SHOTS, templatePhoneShotSrc, templateShotFor } from "@/components/templates/shots";
import { getTemplate } from "@/templates";
import { ProjectThumb } from "./project-thumb";
import { shortAgo } from "./grid-bits";
import { ProjectFilters } from "./project-filters";
import { SpaceHero, type SpaceHeroWorkspace } from "./space-hero/space-hero";

export type OverviewMember = { id: string; name: string; avatarUrl: string | null; role: string };
type Tone = "ok" | "warn" | "error" | "info" | undefined;

/** A project's state, from its database status only (never inferred). */
export function projectState(p: ProjectCardItem): { label: string; tone: Tone } {
  const s = p.status;
  if (s?.deploy === "building") return { label: "Building", tone: "warn" };
  if (s?.live) return { label: "Live", tone: "ok" };
  if (s?.deploy === "failed") return { label: "Failed", tone: "error" };
  if (s?.preview) return { label: "Preview running", tone: "info" };
  return { label: "Draft", tone: undefined };
}

/** A deployment row's dot and one-line summary. */
export function deploymentLine(d: DeploymentRow): { tone: Tone; text: string } {
  switch (d.status) {
    case "live":
      return { tone: "ok", text: d.host ? `Production · ${d.host}` : "Production" };
    case "failed":
      return { tone: "error", text: d.error ? `Failed · ${d.error}` : "Failed" };
    case "building":
      return { tone: "warn", text: "Building" };
    case "deploying":
      return { tone: "warn", text: "Uploading" };
    case "queued":
      return { tone: "warn", text: "Queued" };
    case "rolled_back":
      return { tone: undefined, text: d.host ? `Previous version · ${d.host}` : "Previous version" };
    default:
      return { tone: undefined, text: d.status };
  }
}

function resetLabel(periodStart: Date) {
  const d = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/* ------------------------------------------------------------------------------------------------
   Left: usage numbers stacked (the plan's real limits)
   ------------------------------------------------------------------------------------------------ */

function Meter({ label, used, limit, unit }: { label: string; used: number; limit: number; unit?: string }) {
  const unlimited = limit < 0;
  const ratio = unlimited || limit <= 0 ? 0 : Math.min(1, used / limit);
  const tone = ratio >= 0.9 ? "error" : ratio >= 0.7 ? "warn" : undefined;
  const fmt = (n: number) => n.toLocaleString("en-US");
  return (
    <div className="ov-tele__m">
      <p className="ov-tele__v">
        {fmt(used)}
        <small>{unlimited ? (unit ? ` ${unit}` : "") : ` / ${fmt(limit)}${unit ? ` ${unit}` : ""}`}</small>
      </p>
      <p className="ov-tele__l">{label}</p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={unlimited ? undefined : limit}
        aria-valuenow={unlimited ? undefined : Math.min(used, Math.max(limit, 0))}
        aria-valuetext={unlimited ? `${used} used, no fixed limit` : `${used} of ${limit}${unit ? ` ${unit}` : ""}`}
        className="ov-tele__bar"
        data-tone={tone}
      >
        <span style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  );
}

function Telemetry({ e, projectCount, plan }: { e: KpiEntitlements | null; projectCount: number; plan: string | null }) {
  return (
    <section aria-labelledby="ov-usage" className="ov-tele">
      <h2 id="ov-usage" className="ov-cap">
        <Link href="/settings/usage">Usage</Link>
        {e ? <span> · resets {resetLabel(e.periodStart)}</span> : null}
      </h2>
      {e ? (
        <>
          <Meter label="AI requests" used={e.used.ai_request} limit={e.limits.aiRequestsPerMonth} />
          <Meter label="Preview time" used={e.used.runtime_minutes} limit={e.limits.runtimeMinutesPerMonth} unit="min" />
          <Meter label={plan ? `Projects · ${plan} plan` : "Projects"} used={projectCount} limit={e.limits.projects} />
          <Meter label="Deployments" used={e.used.deployment} limit={e.limits.deploymentsPerMonth} />
        </>
      ) : (
        <p className="ov-empty">No workspace selected.</p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------
   Right: recent deploys
   ------------------------------------------------------------------------------------------------ */

function RecentDeploys({ deployments }: { deployments: DeploymentRow[] }) {
  return (
    <section aria-labelledby="ov-deploys" className="ov-logs">
      <div className="ov-logs__head">
        <h2 id="ov-deploys" className="ov-cap">
          Recent deploys
        </h2>
        <Link href="/dashboard/deployments" className="ov-cap ov-cap--link">
          View all
        </Link>
      </div>
      {deployments.length ? (
        <ol>
          {deployments.map((d) => {
            const line = deploymentLine(d);
            return (
              <li key={d.id} className="ov-logs__e">
                <time dateTime={d.at} title={absoluteTime(d.at)} suppressHydrationWarning>
                  {shortAgo(d.at)}
                </time>
                <span className="min-w-0">
                  <Link href={`/projects/${d.projectId}`} className="ov-logs__n">
                    {d.projectName}
                  </Link>
                  <small title={line.text}>
                    <span className="app-dot" data-tone={line.tone} aria-hidden="true" />
                    {line.text}
                  </small>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="ov-empty">No deployments yet. Publish a project from the editor and it shows up here.</p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------
   Bottom: projects as a perforated filmstrip (All / Live / Drafts)
   ------------------------------------------------------------------------------------------------ */

/** The frame's picture: the starter's real capture (phone frame for Expo projects), else the drawn thumbnail. Decorative. */
function FilmThumb({ p }: { p: ProjectCardItem }) {
  const phone = p.framework === "expo";
  const phoneSrc = p.templateId ? templatePhoneShotSrc(p.templateId) : null;
  if (phone) {
    return (
      <span className="ov-reel__im ov-reel__im--m" aria-hidden="true">
        <span className="ov-phone">
          {phoneSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- real capture of the starter
            <img src={phoneSrc} alt="" width={780} height={1688} loading="lazy" decoding="async" />
          ) : (
            <Smartphone className="m-auto size-4 text-muted-foreground" />
          )}
        </span>
        <span className="ov-reel__tg">Expo</span>
      </span>
    );
  }
  if (p.templateId && TEMPLATE_SHOTS.has(p.templateId)) {
    return (
      <span className="ov-reel__im" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- real capture of the starter */}
        <img src={templateShotFor(p.templateId, 360)} alt="" width={720} height={450} loading="lazy" decoding="async" />
      </span>
    );
  }
  return (
    <span className="ov-reel__im ov-reel__im--glyph" aria-hidden="true">
      <ProjectThumb templateId={p.templateId} framework={p.framework} size="lg" className="h-[60px] w-24 rounded-[6px]" />
    </span>
  );
}

function Reels({ projects, empty, canCreate, templateCount }: { projects: ProjectCardItem[]; empty: React.ReactNode; canCreate: boolean; templateCount: number }) {
  return (
    <ul className="ov-reels" aria-label="Projects">
      {projects.length === 0 ? <li className="ov-reels__empty">{empty}</li> : null}
      {projects.map((p) => {
        const st = projectState(p);
        const touch = lastTouch(p);
        const starter = p.templateId ? getTemplate(p.templateId)?.name : null;
        return (
          <li key={p.id} className="ov-reel">
            <Link
              href={`/projects/${p.id}`}
              className="ov-reel__a"
              title={[p.name, frameworkLabel(p.framework), p.status?.live?.host, starter ? `Picture: the ${starter} starter` : null].filter(Boolean).join(" · ")}
            >
              <FilmThumb p={p} />
              <span className="ov-reel__ln">
                <span className="ov-reel__n">{p.name}</span>
                <span className="ov-reel__s">
                  <span className="app-dot" data-tone={st.tone} aria-hidden="true" />
                  {st.label} ·{" "}
                  <time dateTime={touch.iso} suppressHydrationWarning>
                    {shortAgo(touch.iso)}
                  </time>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
      <li className="ov-reel ov-reel--new">
        {canCreate ? (
          <Link href="/new-project" className="ov-reel__a">
            <span className="ov-reel__im ov-reel__im--new">
              <Plus className="size-3.5" aria-hidden="true" /> New project
            </span>
            <span className="ov-reel__ln">
              <span className="ov-reel__n ov-reel__n--dim">Blank, a template or GitHub</span>
            </span>
          </Link>
        ) : (
          <Link href="/dashboard/templates" className="ov-reel__a">
            <span className="ov-reel__im ov-reel__im--new">Browse templates</span>
            <span className="ov-reel__ln">
              <span className="ov-reel__n ov-reel__n--dim">Starters</span>
              <span className="ov-reel__s">{templateCount}</span>
            </span>
          </Link>
        )}
      </li>
    </ul>
  );
}

/** Project ids per filter (most recently touched first, at most the strip's length) and the real totals. */
export type OverviewLists = Record<"all" | "live" | "drafts", { ids: string[]; total: number }>;

const FILTERS: { id: keyof OverviewLists; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "drafts", label: "Drafts" },
];

/**
 * Overview (the signed-in dashboard), "Cinematic Orbit": a full-bleed live scene with the composer
 * centred (runtime tabs, starter, attach image, visibility, Build, quick starts), the plan's usage
 * stacked on the left, recent deploys on the right and the projects as a perforated filmstrip along the
 * bottom (All / Live / Drafts). Under the scene: the getting-started strip and the team. Every value
 * comes from the page's database reads and the plan config.
 */
export function Overview({
  workspace,
  greeting,
  composer,
  modes,
  projects,
  lists,
  deployments,
  entitlements,
  members,
  memberLimit,
  canCreate,
  checklist,
  templateCount,
}: {
  /** The current workspace (plan as its display name). */
  workspace: SpaceHeroWorkspace | null;
  /** The signed-in person's first name, for the caption. */
  greeting: string | null;
  composer: React.ComponentProps<typeof PromptBox>;
  /** Runtime tabs above the composer (each a real starter template). */
  modes: PromptMode[];
  /** Card data for every project any filter shows. */
  projects: ProjectCardItem[];
  lists: OverviewLists;
  deployments: DeploymentRow[];
  entitlements: KpiEntitlements | null;
  members: OverviewMember[];
  /** Plan seat limit (-1 = unlimited); null without a workspace. */
  memberLimit: number | null;
  canCreate: boolean;
  checklist: { milestones: ChecklistMilestones; emailVerified: boolean; emailConfigured: boolean } | null;
  templateCount: number;
}) {
  const projectCount = lists.all.total;
  const shownMembers = members.slice(0, 8);
  const byId = new Map(projects.map((p) => [p.id, p]));
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((p): p is ProjectCardItem => Boolean(p));
  const newest = pick(lists.all.ids)[0];
  const empty: Record<keyof OverviewLists, React.ReactNode> = {
    all: (
      <>
        <b>No projects yet</b>
        <span>
          Describe your first app above, start from a{" "}
          <Link href="/dashboard/templates" className="underline underline-offset-4">
            template
          </Link>
          {canCreate ? (
            <>
              , or{" "}
              <Link href="/import-project" className="underline underline-offset-4">
                import from GitHub
              </Link>
            </>
          ) : null}
          .
        </span>
      </>
    ),
    live: (
      <>
        <b>Nothing is live yet</b>
        <span>Publish a project from the editor and it shows up here with its domain.</span>
      </>
    ),
    drafts: (
      <>
        <b>No drafts</b>
        <span>Every project in this workspace is published.</span>
      </>
    ),
  };

  const film = (
    <section aria-labelledby="ov-projects" className="ov-film">
      <div className="ov-film__inner">
        <ProjectFilters
          label="Filter projects"
          heading={
            <div className="ov-film__hd">
              <h2 id="ov-projects" className="ov-cap">
                Projects
              </h2>
              <p className="ov-film__n">
                {projectCount} project{projectCount === 1 ? "" : "s"}
              </p>
              {newest ? (
                <p className="ov-film__p">
                  Last touched{" "}
                  <time dateTime={lastTouch(newest).iso} suppressHydrationWarning>
                    {relativeTime(lastTouch(newest).iso)}
                  </time>
                </p>
              ) : null}
            </div>
          }
          actions={
            <Link href="/projects" className="ov-film__all">
              All projects
            </Link>
          }
          tabs={FILTERS.map((f) => {
            const list = pick(lists[f.id].ids);
            return {
              id: f.id,
              label: f.label,
              count: lists[f.id].total,
              panel: <Reels projects={list} empty={projectCount === 0 ? empty.all : empty[f.id]} canCreate={canCreate} templateCount={templateCount} />,
            };
          })}
        />
      </div>
    </section>
  );

  return (
    <>
      <SpaceHero
        caption={
          <>
            {greeting ? `Welcome back, ${greeting}` : "Welcome back"}
            {workspace ? (
              <>
                <span aria-hidden="true">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
                <span className="sr-only">, </span>
                {workspace.plan} plan
              </>
            ) : null}
          </>
        }
        left={<Telemetry e={entitlements} projectCount={projectCount} plan={workspace?.plan ?? null} />}
        right={<RecentDeploys deployments={deployments} />}
        bottom={film}
      >
        <PromptBox {...composer} hero={{ modes, recent: [] }} />
      </SpaceHero>

      <div className="ov-after">
        {checklist ? (
          <GettingStarted
            milestones={checklist.milestones}
            canCreate={canCreate}
            emailVerified={checklist.emailVerified}
            emailConfigured={checklist.emailConfigured}
            resumeHref={newest ? `/projects/${newest.id}` : undefined}
            layout="strip"
          />
        ) : null}

        <section className="ov-crew" aria-labelledby="ov-members">
          <div className="ov-crew__head">
            <h2 id="ov-members" className="ov-cap">
              <Link href="/settings/members">Team</Link>
            </h2>
            <span aria-hidden="true" className="ov-crew__rule" />
            {memberLimit !== null ? <p className="ov-crew__meta">{memberLimit < 0 ? `${members.length} seats` : `${members.length} of ${memberLimit} seats`}</p> : null}
          </div>
          {shownMembers.length ? (
            <ul className="ov-crew__list">
              {shownMembers.map((m) => (
                <li key={m.id}>
                  <Avatar name={m.name} src={m.avatarUrl} size="xs" className="[&>span]:size-[22px]" />
                  <span className="truncate text-foreground">{m.name}</span>
                  <span className="ov-crew__role">{m.role}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ov-empty">No members.</p>
          )}
          <Link href={members.length > shownMembers.length ? "/settings/members" : "/settings/members#invite"} className="ov-crew__link">
            {members.length > shownMembers.length ? `View all ${members.length} members` : "Invite members"}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </>
  );
}
